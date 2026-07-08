import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getMediaTypeFromMime } from "@/lib/config";
import { putR2Object } from "@/lib/r2";
import { supabase } from "@/lib/supabase";
import type { Media, SiteSettings } from "@/lib/types";
import { normalizeMedia } from "@/lib/albums";

function extensionFromMime(mimeType: string) {
  const fallback = mimeType.split("/").at(1) ?? "bin";
  return fallback.replace("jpeg", "jpg").replace("quicktime", "mov");
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
  const metadata = await image.metadata();
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

  return {
    album_id: albumId,
    owner_id: ownerId,
    media_type: "image",
    title: fileName.replace(/\.[^.]+$/, ""),
    r2_key: publicKey,
    public_r2_key: publicKey,
    original_private_r2_key: privateOriginalKey,
    thumbnail_r2_key: thumbKey,
    medium_r2_key: mediumKey,
    url: publicUrl,
    thumbnail_url: thumbnailUrl,
    medium_url: mediumUrl,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    file_size: publicBuffer.byteLength,
    mime_type: "image/webp",
    original_filename: fileName,
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
    title: fileName.replace(/\.[^.]+$/, ""),
    r2_key: originalKey,
    poster_r2_key: null,
    url,
    poster_url: null,
    thumbnail_url: null,
    file_size: buffer.byteLength,
    mime_type: mimeType,
    original_filename: fileName,
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
