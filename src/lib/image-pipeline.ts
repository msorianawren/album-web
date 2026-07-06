import { encode } from "blurhash";
import sharp from "sharp";
import { putR2Object } from "@/lib/r2";
import type { UploadResult } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export async function processAndStoreImage({
  albumId,
  fileId,
  fileName,
  contentType,
  buffer,
}: {
  albumId: string;
  fileId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}): Promise<UploadResult> {
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;

  const thumbBuffer = await image
    .clone()
    .resize({ width: 240, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const mediumBuffer = await image
    .clone()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const raw = await image
    .clone()
    .resize({ width: 32, height: 32, fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const blurHash = encode(
    new Uint8ClampedArray(raw.data),
    raw.info.width,
    raw.info.height,
    4,
    3,
  );

  const extension = contentType.split("/").at(1)?.replace("jpeg", "jpg") ?? "jpg";
  const originalKey = `albums/${albumId}/original/${fileId}.${extension}`;
  const thumbKey = `albums/${albumId}/thumb/${fileId}.webp`;
  const mediumKey = `albums/${albumId}/medium/${fileId}.webp`;

  const [originalUrl, thumbUrl, mediumUrl] = await Promise.all([
    putR2Object({
      key: originalKey,
      body: buffer,
      contentType,
      cacheControl: "public, max-age=86400",
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
  ]);

  const { data, error } = await supabase
    .from("images")
    .insert({
      album_id: albumId,
      file_name: fileName,
      width,
      height,
      file_size: buffer.byteLength,
      content_type: contentType,
      blur_hash: blurHash,
      original_key: originalKey,
      medium_key: mediumKey,
      thumb_key: thumbKey,
      file_url: mediumUrl,
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    image: {
      id: String(data.id),
      album_id: String(data.album_id),
      file_name: String(data.file_name),
      width: data.width,
      height: data.height,
      file_size: data.file_size,
      content_type: data.content_type,
      blur_hash: data.blur_hash,
      original_key: data.original_key,
      medium_key: data.medium_key,
      thumb_key: data.thumb_key,
      file_url: data.file_url,
      created_at: data.created_at,
    },
    variants: {
      original: originalUrl,
      medium: mediumUrl,
      thumb: thumbUrl,
    },
  };
}
