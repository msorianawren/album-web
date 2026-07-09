import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getMediaTypeFromMime } from "@/lib/config";
import { putR2Object, getR2Object, deleteR2Objects, getPublicUrl } from "@/lib/r2";
import { supabase } from "@/lib/supabase";
import type { Media, SiteSettings } from "@/lib/types";
import { normalizeMedia } from "@/lib/albums";


function extensionFromMime(mimeType: string) {
  const fallback = mimeType.split("/").at(1) ?? "bin";
  return fallback.replace("jpeg", "jpg").replace("quicktime", "mov");
}

function fileExtension(fileName: string, mimeType: string) {
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && fromName !== fileName.toLowerCase()) return fromName.replace(/[^a-z0-9]/g, "");
  return extensionFromMime(mimeType);
}

function safeDisplayName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim().slice(0, 160) || "Untitled media";
}

function orientationFromDimensions(width?: number | null, height?: number | null) {
  if (!width || !height) return "unknown";
  if (width === height) return "square";
  return height > width ? "portrait" : "landscape";
}

function dateToIso(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  const time = date.getTime();
  return Number.isFinite(time) ? date.toISOString() : null;
}

async function readSafeImageMetadata(buffer: Buffer) {
  try {
    const exifr = await import("exifr");
    const parsed = await exifr.parse(buffer, {
      pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
      translateKeys: true,
      translateValues: true,
      reviveValues: true,
      sanitize: true,
    });
    return {
      takenAt:
        dateToIso(parsed?.DateTimeOriginal) ??
        dateToIso(parsed?.CreateDate) ??
        dateToIso(parsed?.ModifyDate),
      metadataStatus: parsed ? "extracted" : "fallback",
    };
  } catch {
    return {
      takenAt: null,
      metadataStatus: "failed",
    };
  }
}

async function getAlbumOwnerId(albumId: string) {
  const { data, error } = await supabase
    .from("albums")
    .select("owner_id")
    .eq("id", albumId)
    .single();

  if (error || !data?.owner_id) throw new Error("Album not found.");
  return String(data.owner_id);
}

async function setFirstImageAsCoverIfNeeded(albumId: string, mediaId: string, coverUrl?: string | null) {
  const { data: album } = await supabase
    .from("albums")
    .select("cover_url")
    .eq("id", albumId)
    .single();

  if (album?.cover_url) return;

  await supabase
    .from("albums")
    .update({
      cover_media_id: mediaId,
      cover_url: coverUrl,
    })
    .eq("id", albumId);
  await supabase.from("media").update({ is_cover: true }).eq("id", mediaId);
}

async function uploadImageMedia({
  albumId,
  mediaId,
  ownerId,
  fileName,
  mimeType,
  buffer,
  settings,
}: {
  albumId: string;
  mediaId: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  settings: SiteSettings;
}) {
  const image = sharp(buffer, { failOn: "error" }).rotate();
  const [metadata, safeMetadata] = await Promise.all([
    image.metadata(),
    readSafeImageMetadata(buffer),
  ]);
  const pixelCount = (metadata.width ?? 0) * (metadata.height ?? 0);
  if (pixelCount > settings.max_image_pixels) {
    throw new Error("Image dimensions exceed the configured safety limit.");
  }

  const publicKey = `albums/${albumId}/images/${mediaId}/public.webp`;
  const thumbKey = `albums/${albumId}/images/${mediaId}/thumb.webp`;
  const mediumKey = `albums/${albumId}/images/${mediaId}/medium.webp`;
  const privateOriginalKey = settings.store_private_originals
    ? `private/albums/${albumId}/images/${mediaId}/original.${extensionFromMime(mimeType)}`
    : null;

  const baseImage = image.clone().resize({
    width: 3200,
    height: 3200,
    fit: "inside",
    withoutEnlargement: true,
  });

  const watermark = settings.enable_media_watermark && settings.watermark_text
    ? Buffer.from(
        `<svg width="1200" height="260" viewBox="0 0 1200 260" xmlns="http://www.w3.org/2000/svg">
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="86" font-weight="700"
            fill="rgba(255,255,255,0.42)" stroke="rgba(0,0,0,0.20)" stroke-width="2">
            ${settings.watermark_text.replace(/[<>&"']/g, "")}
          </text>
        </svg>`,
      )
    : null;

  const publicPipeline = watermark
    ? baseImage.clone().composite([{ input: watermark, gravity: "southeast" }])
    : baseImage.clone();

  const [publicBuffer, thumbBuffer, mediumBuffer] = await Promise.all([
    publicPipeline.webp({ quality: 92 }).toBuffer(),
    image
      .clone()
      .resize({ width: 640, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer(),
    image
      .clone()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer(),
  ]);

  const uploadJobs = [
    putR2Object({
      key: publicKey,
      body: publicBuffer,
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    }),
    putR2Object({
      key: thumbKey,
      body: thumbBuffer,
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    }),
    putR2Object({
      key: mediumKey,
      body: mediumBuffer,
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    }),
  ];

  if (privateOriginalKey) {
    uploadJobs.push(
      putR2Object({
        key: privateOriginalKey,
        body: buffer,
        contentType: mimeType,
        cacheControl: "private, no-store",
      }),
    );
  }

  const [publicUrl, thumbnailUrl, mediumUrl] = await Promise.all(uploadJobs);

  const width = metadata.width ?? null;
  const height = metadata.height ?? null;
  const takenAt = safeMetadata.takenAt;

  return {
    album_id: albumId,
    owner_id: ownerId,
    media_type: "image",
    title: safeDisplayName(fileName),
    r2_key: publicKey,
    public_r2_key: publicKey,
    original_private_r2_key: privateOriginalKey,
    thumbnail_r2_key: thumbKey,
    medium_r2_key: mediumKey,
    url: publicUrl,
    thumbnail_url: thumbnailUrl,
    medium_url: mediumUrl,
    width,
    height,
    file_size: publicBuffer.byteLength,
    mime_type: "image/webp",
    original_filename: fileName,
    safe_display_name: safeDisplayName(fileName),
    uploaded_at: new Date().toISOString(),
    taken_at: takenAt,
    sort_date: takenAt ?? new Date().toISOString(),
    aspect_ratio: width && height ? Number((width / height).toFixed(6)) : null,
    orientation: orientationFromDimensions(width, height),
    file_extension: fileExtension(fileName, mimeType),
    original_file_size: buffer.byteLength,
    original_mime_type: mimeType,
    featured_rank: 0,
    view_count: 0,
    metadata_status: takenAt ? safeMetadata.metadataStatus : "fallback",
    processing_status: "processed",
    security_status: "processed",
    security_notes: "Image was decoded, orientation-normalized, resized when needed, re-encoded as WebP, and metadata-stripped before publishing.",
    download_allowed: true,
    original_download_allowed: false,
    metadata_stripped: true,
  };
}

async function uploadVideoMedia({
  albumId,
  mediaId,
  ownerId,
  fileName,
  mimeType,
  buffer,
  settings,
}: {
  albumId: string;
  mediaId: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  settings: SiteSettings;
}) {
  if (!settings.enable_video_uploads) {
    throw new Error("Video uploads are disabled in Studio settings.");
  }

  const extension = extensionFromMime(mimeType);
  const uploadedAt = new Date().toISOString();
  const originalKey = `albums/${albumId}/videos/${mediaId}/original.${extension}`;
  const url = await putR2Object({
    key: originalKey,
    body: buffer,
    contentType: mimeType,
    cacheControl: "public, max-age=86400",
  });

  return {
    album_id: albumId,
    owner_id: ownerId,
    media_type: "video",
    title: safeDisplayName(fileName),
    r2_key: originalKey,
    poster_r2_key: null,
    url,
    poster_url: null,
    thumbnail_url: null,
    file_size: buffer.byteLength,
    mime_type: mimeType,
    original_filename: fileName,
    safe_display_name: safeDisplayName(fileName),
    uploaded_at: uploadedAt,
    taken_at: null,
    sort_date: uploadedAt,
    aspect_ratio: null,
    orientation: "unknown",
    file_extension: fileExtension(fileName, mimeType),
    original_file_size: buffer.byteLength,
    original_mime_type: mimeType,
    featured_rank: 0,
    view_count: 0,
    metadata_status: "unavailable",
    processing_status: "pending",
    security_status: "needs_review",
    security_notes: "Video passed MIME, extension, and file signature checks. Container metadata stripping/transcoding requires a media worker.",
    download_allowed: true,
    original_download_allowed: false,
    metadata_stripped: false,
    // TODO: generate poster.webp and duration with ffmpeg or a media worker.
  };
}

export async function uploadMediaFile({
  albumId,
  fileName,
  mimeType,
  buffer,
  settings,
}: {
  albumId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  settings: SiteSettings;
}): Promise<Media> {
  const mediaType = getMediaTypeFromMime(mimeType);
  if (!mediaType) throw new Error("Unsupported media type.");

  const ownerId = await getAlbumOwnerId(albumId);
  const mediaId = randomUUID();
  const insertPayload =
    mediaType === "image"
      ? await uploadImageMedia({
          albumId,
          mediaId,
          ownerId,
          fileName,
          mimeType,
          buffer,
          settings,
        })
      : await uploadVideoMedia({
          albumId,
          mediaId,
          ownerId,
          fileName,
          mimeType,
          buffer,
          settings,
        });

  const { data, error } = await supabase
    .from("media")
    .insert({ id: mediaId, ...insertPayload })
    .select("*")
    .single();

  if (error) {
    const legacyPayload = Object.fromEntries(
      Object.entries(insertPayload).filter(
        ([key]) =>
          ![
            "public_r2_key",
            "original_private_r2_key",
            "security_status",
            "security_notes",
            "download_allowed",
            "original_download_allowed",
            "metadata_stripped",
            "safe_display_name",
            "uploaded_at",
            "taken_at",
            "sort_date",
            "aspect_ratio",
            "orientation",
            "file_extension",
            "original_file_size",
            "original_mime_type",
            "featured_rank",
            "view_count",
            "metadata_status",
            "processing_status",
          ].includes(key),
      ),
    );
    const { data: legacyData, error: legacyError } = await supabase
      .from("media")
      .insert({ id: mediaId, ...legacyPayload })
      .select("*")
      .single();

    if (!legacyError && legacyData) {
      if (mediaType === "image") {
        await setFirstImageAsCoverIfNeeded(
          albumId,
          mediaId,
          legacyData.thumbnail_url ?? legacyData.url,
        );
      }
      return normalizeMedia(legacyData);
    }
  }

  if (error && "medium_url" in insertPayload) {
    const fallbackPayload = Object.fromEntries(
      Object.entries(insertPayload).filter(
        ([key]) => key !== "medium_url" && key !== "medium_r2_key",
      ),
    );
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("media")
      .insert({ id: mediaId, ...fallbackPayload })
      .select("*")
      .single();

    if (fallbackError) throw fallbackError;
    if (mediaType === "image") {
      await setFirstImageAsCoverIfNeeded(
        albumId,
        mediaId,
        fallbackData.thumbnail_url ?? fallbackData.url,
      );
    }

    return normalizeMedia(fallbackData);
  }

  if (error) throw error;
  if (mediaType === "image") {
    await setFirstImageAsCoverIfNeeded(albumId, mediaId, data.thumbnail_url ?? data.url);
  }

  return normalizeMedia(data);
}

export async function completeUploadFile({
  albumId,
  mediaId,
  r2Key,
  fileName,
  mimeType,
  size,
  settings,
  width,
  height,
  durationSeconds,
}: {
  albumId: string;
  mediaId: string;
  r2Key: string;
  fileName: string;
  mimeType: string;
  size: number;
  settings: SiteSettings;
  width?: number;
  height?: number;
  durationSeconds?: number;
}): Promise<Media> {
  const mediaType = getMediaTypeFromMime(mimeType);
  if (!mediaType) throw new Error("Unsupported media type.");

  const ownerId = await getAlbumOwnerId(albumId);

  let insertPayload;
  if (mediaType === "image") {
    // 1. Fetch original image from R2
    const buffer = await getR2Object(r2Key);
    
    // 2. Process image and upload public/thumb/medium WebP variants
    insertPayload = await uploadImageMedia({
      albumId,
      mediaId,
      ownerId,
      fileName: fileName,
      mimeType,
      buffer,
      settings,
    });

    // 3. Delete the temporary original upload key (original.ext) from R2
    // to prevent cluttering the public albums folder.
    await deleteR2Objects([r2Key]);
  } else {
    // For videos, the original video is already at the final key location.
    // We do not need to download or process it.
    const uploadedAt = new Date().toISOString();
    insertPayload = {
      album_id: albumId,
      owner_id: ownerId,
      media_type: "video",
      title: safeDisplayName(fileName),
      r2_key: r2Key,
      poster_r2_key: null,
      url: getPublicUrl(r2Key),
      poster_url: null,
      thumbnail_url: null,
      file_size: size,
      mime_type: mimeType,
      original_filename: fileName,
      safe_display_name: safeDisplayName(fileName),
      uploaded_at: uploadedAt,
      taken_at: null,
      sort_date: uploadedAt,
      aspect_ratio: width && height ? Number((width / height).toFixed(6)) : null,
      orientation: orientationFromDimensions(width, height),
      file_extension: fileExtension(fileName, mimeType),
      original_file_size: size,
      original_mime_type: mimeType,
      featured_rank: 0,
      view_count: 0,
      metadata_status: "unavailable",
      processing_status: "pending",
      security_status: "needs_review",
      security_notes: "Video passed MIME, extension, and file signature checks. Container metadata stripping/transcoding requires a media worker.",
      download_allowed: true,
      original_download_allowed: false,
      metadata_stripped: false,
      width: width ?? null,
      height: height ?? null,
      duration_seconds: durationSeconds ?? null,
    };
  }

  // Insert to database (reusing the same schema fallbacks as uploadMediaFile)
  const { data, error } = await supabase
    .from("media")
    .insert({ id: mediaId, ...insertPayload })
    .select("*")
    .single();

  if (error) {
    const legacyPayload = Object.fromEntries(
      Object.entries(insertPayload).filter(
        ([key]) =>
          ![
            "public_r2_key",
            "original_private_r2_key",
            "security_status",
            "security_notes",
            "download_allowed",
            "original_download_allowed",
            "metadata_stripped",
            "safe_display_name",
            "uploaded_at",
            "taken_at",
            "sort_date",
            "aspect_ratio",
            "orientation",
            "file_extension",
            "original_file_size",
            "original_mime_type",
            "featured_rank",
            "view_count",
            "metadata_status",
            "processing_status",
          ].includes(key),
      ),
    );
    const { data: legacyData, error: legacyError } = await supabase
      .from("media")
      .insert({ id: mediaId, ...legacyPayload })
      .select("*")
      .single();

    if (!legacyError && legacyData) {
      if (mediaType === "image") {
        await setFirstImageAsCoverIfNeeded(
          albumId,
          mediaId,
          legacyData.thumbnail_url ?? legacyData.url,
        );
      }
      return normalizeMedia(legacyData);
    }
  }

  if (error && "medium_url" in insertPayload) {
    const fallbackPayload = Object.fromEntries(
      Object.entries(insertPayload).filter(
        ([key]) => key !== "medium_url" && key !== "medium_r2_key",
      ),
    );
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("media")
      .insert({ id: mediaId, ...fallbackPayload })
      .select("*")
      .single();

    if (fallbackError) throw fallbackError;
    if (mediaType === "image") {
      await setFirstImageAsCoverIfNeeded(
        albumId,
        mediaId,
        fallbackData.thumbnail_url ?? fallbackData.url,
      );
    }

    return normalizeMedia(fallbackData);
  }

  if (error) throw error;
  if (mediaType === "image") {
    await setFirstImageAsCoverIfNeeded(albumId, mediaId, data.thumbnail_url ?? data.url);
  }

  return normalizeMedia(data);
}

