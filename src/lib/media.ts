import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getMediaTypeFromMime } from "@/lib/config";
import { putR2Object } from "@/lib/r2";
import { supabase } from "@/lib/supabase";
import type { Media } from "@/lib/types";
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

async function uploadImageMedia({
  albumId,
  mediaId,
  ownerId,
  fileName,
  mimeType,
  buffer,
}: {
  albumId: string;
  mediaId: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const extension = extensionFromMime(mimeType);
  const originalKey = `albums/${albumId}/images/${mediaId}/original.${extension}`;
  const thumbKey = `albums/${albumId}/images/${mediaId}/thumb.webp`;

  const thumbBuffer = await image
    .clone()
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const [originalUrl, thumbnailUrl] = await Promise.all([
    putR2Object({
      key: originalKey,
      body: buffer,
      contentType: mimeType,
      cacheControl: "public, max-age=86400",
    }),
    putR2Object({
      key: thumbKey,
      body: thumbBuffer,
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    }),
  ]);

  return {
    album_id: albumId,
    owner_id: ownerId,
    media_type: "image",
    title: fileName.replace(/\.[^.]+$/, ""),
    r2_key: originalKey,
    thumbnail_r2_key: thumbKey,
    url: originalUrl,
    thumbnail_url: thumbnailUrl,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    file_size: buffer.byteLength,
    mime_type: mimeType,
    original_filename: fileName,
  };
}

async function uploadVideoMedia({
  albumId,
  mediaId,
  ownerId,
  fileName,
  mimeType,
  buffer,
}: {
  albumId: string;
  mediaId: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
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
    // TODO: generate poster.webp and duration with ffmpeg or a media worker.
  };
}

export async function uploadMediaFile({
  albumId,
  fileName,
  mimeType,
  buffer,
}: {
  albumId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
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
        })
      : await uploadVideoMedia({
          albumId,
          mediaId,
          ownerId,
          fileName,
          mimeType,
          buffer,
        });

  const { data, error } = await supabase
    .from("media")
    .insert({ id: mediaId, ...insertPayload })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeMedia(data);
}
