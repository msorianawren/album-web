import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicUrl, getR2Object, putR2Object, type R2BucketRole } from "@/lib/r2";
import type { SiteSettings } from "@/lib/types";
import {
  MediaQuarantineError,
  validateAndProcessImage,
} from "@/lib/media/image-processing-core";

export { MediaQuarantineError, validateAndProcessImage } from "@/lib/media/image-processing-core";

const PROCESSING_VERSION = 2;
interface ProcessingJobRow {
  id: string;
  media_id: string;
  album_id: string;
  source_object_key: string;
  source_mime_type: string;
  source_filename: string;
  source_size: number;
}

function variantKey(
  bucketRole: R2BucketRole,
  albumId: string,
  mediaId: string,
  variant: string,
  extension: "webp" | "avif",
) {
  return bucketRole === "private"
    ? `private/albums/${albumId}/${mediaId}/${variant}/v${PROCESSING_VERSION}.${extension}`
    : `albums/${albumId}/images/${mediaId}/v${PROCESSING_VERSION}/${variant}.${extension}`;
}

function clientUrl(bucketRole: R2BucketRole, mediaId: string, variant: "thumbnail" | "medium" | "display", key: string) {
  return bucketRole === "private"
    ? `/api/media/${encodeURIComponent(mediaId)}/content?variant=${variant}`
    : getPublicUrl(key);
}

async function recordPrivateManifest(
  client: SupabaseClient,
  job: ProcessingJobRow,
  keys: Record<"thumbnail" | "medium" | "large", string>,
) {
  const rows = [
    { variant: "thumbnail", key: keys.thumbnail },
    { variant: "medium", key: keys.medium },
    { variant: "display", key: keys.large },
  ].map(({ variant, key }) => ({
    album_id: job.album_id,
    media_id: job.media_id,
    variant,
    object_key: key,
    legacy_object_key: job.source_object_key,
    intended_private_key: key,
    bucket_role: "private",
    mime_type: "image/webp",
    migration_state: "active",
    verified_at: new Date().toISOString(),
    activated_at: new Date().toISOString(),
  }));
  const result = await client.from("private_media_assets").upsert(rows, {
    onConflict: "media_id,variant",
  });
  if (result.error) throw result.error;
}

export async function processImageJob(
  client: SupabaseClient,
  job: ProcessingJobRow,
  settings: SiteSettings,
) {
  const albumResult = await client.from("albums").select("status").eq("id", job.album_id).single();
  if (albumResult.error || !albumResult.data) throw albumResult.error ?? new Error("ALBUM_NOT_FOUND");
  const bucketRole: R2BucketRole = albumResult.data.status === "private" ? "private" : "public";
  const source = await getR2Object(job.source_object_key, "private");
  if (source.byteLength !== Number(job.source_size)) {
    throw new MediaQuarantineError("SOURCE_SIZE_MISMATCH");
  }
  const processed = await validateAndProcessImage(source, job.source_mime_type, settings);
  const duplicateResult = await client
    .from("media")
    .select("id")
    .eq("content_hash", processed.contentHash)
    .eq("processing_status", "ready")
    .neq("id", job.media_id)
    .limit(1)
    .maybeSingle();
  if (duplicateResult.error) throw duplicateResult.error;

  const webpKeys = Object.fromEntries(
    processed.variants.map((item) => [
      item.name,
      variantKey(bucketRole, job.album_id, job.media_id, item.name, "webp"),
    ]),
  ) as Record<"thumbnail" | "medium" | "large", string>;
  const avifKeys: Partial<Record<"thumbnail" | "medium" | "large", string>> = {};
  await Promise.all(processed.variants.flatMap((variant) => {
    const cacheControl = bucketRole === "private" ? "private, no-store" : "public, max-age=31536000, immutable";
    const writes = [putR2Object({
      key: webpKeys[variant.name],
      body: variant.webp,
      contentType: "image/webp",
      cacheControl,
      bucketRole,
    })];
    if (variant.avif) {
      const key = variantKey(bucketRole, job.album_id, job.media_id, variant.name, "avif");
      avifKeys[variant.name] = key;
      writes.push(putR2Object({
        key,
        body: variant.avif,
        contentType: "image/avif",
        cacheControl,
        bucketRole,
      }));
    }
    return writes;
  }));
  if (bucketRole === "private") await recordPrivateManifest(client, job, webpKeys);

  const large = processed.variants.find((item) => item.name === "large")!;
  return {
    display_r2_key: webpKeys.large,
    thumbnail_r2_key: webpKeys.thumbnail,
    medium_r2_key: webpKeys.medium,
    large_r2_key: webpKeys.large,
    display_url: clientUrl(bucketRole, job.media_id, "display", webpKeys.large),
    thumbnail_url: clientUrl(bucketRole, job.media_id, "thumbnail", webpKeys.thumbnail),
    medium_url: clientUrl(bucketRole, job.media_id, "medium", webpKeys.medium),
    large_url: clientUrl(bucketRole, job.media_id, "display", webpKeys.large),
    avif_thumbnail_r2_key: avifKeys.thumbnail ?? "",
    avif_medium_r2_key: avifKeys.medium ?? "",
    avif_large_r2_key: avifKeys.large ?? "",
    width: processed.width,
    height: processed.height,
    aspect_ratio: processed.aspectRatio,
    orientation: processed.orientation,
    display_size: large.webp.byteLength,
    taken_at: processed.takenAt ?? "",
    metadata_status: processed.metadataStatus,
    content_hash: processed.contentHash,
    duplicate_of_media_id: duplicateResult.data?.id ?? "",
    blurhash: processed.blurhash,
    processing_version: PROCESSING_VERSION,
  };
}

export function createProcessingWorkerId() {
  return `media-worker-${randomUUID()}`;
}
