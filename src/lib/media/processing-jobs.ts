import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeFilename } from "@/lib/filenames";
import { getSiteSettings } from "@/lib/site-settings";
import { headR2Object, putR2Object } from "@/lib/r2";
import {
  createProcessingWorkerId,
  MediaQuarantineError,
  processImageJob,
} from "@/lib/media/image-processing";

interface UploadReservation {
  mediaId: string;
  sourceKey: string;
  safeName: string;
  mimeType: string;
  size: number;
}

interface JobRow {
  id: string;
  media_id: string;
  album_id: string;
  source_object_key: string;
  source_mime_type: string;
  source_filename: string;
  source_size: number;
}

function extensionFromMime(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/avif") return "avif";
  throw new Error("UNSUPPORTED_IMAGE_TYPE");
}

export async function reserveImageProcessingUpload({
  client,
  albumId,
  fileName,
  mimeType,
  size,
}: {
  client: SupabaseClient;
  albumId: string;
  fileName: string;
  mimeType: string;
  size: number;
}): Promise<UploadReservation> {
  const mediaId = randomUUID();
  const safeName = safeFilename(fileName, "upload");
  const sourceKey = `staging/media/${mediaId}/source.${extensionFromMime(mimeType)}`;
  const idempotencyKey = createHash("sha256")
    .update(`${mediaId}:${albumId}:${sourceKey}:${size}`)
    .digest("hex");
  const result = await client.rpc("register_media_processing_upload", {
    target_media_id: mediaId,
    target_album_id: albumId,
    source_key: sourceKey,
    source_mime: mimeType,
    source_name: safeName,
    source_bytes: size,
    target_idempotency_key: idempotencyKey,
  });
  if (result.error) throw result.error;
  return { mediaId, sourceKey, safeName, mimeType, size };
}

export async function verifyAndQueueImageUpload(
  client: SupabaseClient,
  mediaId: string,
) {
  const jobResult = await client
    .from("media_processing_jobs")
    .select("media_id,source_object_key,source_mime_type,source_size,state")
    .eq("media_id", mediaId)
    .single();
  if (jobResult.error || !jobResult.data) throw jobResult.error ?? new Error("UPLOAD_RESERVATION_NOT_FOUND");
  const head = await headR2Object(jobResult.data.source_object_key, "private");
  if (Number(head.contentLength) !== Number(jobResult.data.source_size)) {
    throw new MediaQuarantineError("SOURCE_SIZE_MISMATCH");
  }
  if (head.contentType?.split(";", 1)[0]?.toLowerCase() !== jobResult.data.source_mime_type) {
    throw new MediaQuarantineError("SOURCE_CONTENT_TYPE_MISMATCH");
  }
  const queued = await client.rpc("queue_media_processing_upload", {
    target_media_id: mediaId,
  });
  if (queued.error) throw queued.error;
  const state = String((queued.data as { state?: unknown } | null)?.state ?? "queued");
  return { mediaId, status: state };
}

export async function enqueueImageBuffer({
  client,
  albumId,
  fileName,
  mimeType,
  buffer,
}: {
  client: SupabaseClient;
  albumId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const reservation = await reserveImageProcessingUpload({
    client,
    albumId,
    fileName,
    mimeType,
    size: buffer.byteLength,
  });
  await putR2Object({
    key: reservation.sourceKey,
    body: buffer,
    contentType: mimeType,
    cacheControl: "private, no-store",
    bucketRole: "private",
  });
  return verifyAndQueueImageUpload(client, reservation.mediaId);
}

function safeErrorCode(error: unknown) {
  if (error instanceof MediaQuarantineError) return error.code;
  if (error && typeof error === "object" && "code" in error) {
    const value = String((error as { code?: unknown }).code ?? "");
    if (/^[A-Z0-9_]{2,80}$/i.test(value)) return value.toUpperCase();
  }
  return "PROCESSING_TRANSIENT_FAILURE";
}

export async function processQueuedImageJobs(
  client: SupabaseClient,
  batchSize = 2,
) {
  const workerId = createProcessingWorkerId();
  const claim = await client.rpc("claim_media_processing_jobs", {
    worker_id: workerId,
    batch_size: Math.max(1, Math.min(batchSize, 10)),
  });
  if (claim.error) throw claim.error;
  const jobs = (claim.data ?? []) as JobRow[];
  const settings = await getSiteSettings(client);
  const summary = { claimed: jobs.length, ready: 0, retried: 0, failed: 0, quarantined: 0 };

  for (const job of jobs) {
    try {
      const result = await processImageJob(client, job, settings);
      const completionResult = { ...result, auto_set_cover: settings.auto_set_first_image_as_cover };
      const complete = await client.rpc("complete_media_processing_job", {
        target_job_id: job.id,
        worker_id: workerId,
        result: completionResult,
      });
      if (complete.error) throw complete.error;
      summary.ready += 1;
    } catch (error) {
      const quarantine = error instanceof MediaQuarantineError;
      const failed = await client.rpc("fail_media_processing_job", {
        target_job_id: job.id,
        worker_id: workerId,
        error_code: safeErrorCode(error),
        quarantine,
      });
      if (failed.error) throw failed.error;
      const state = String((failed.data as { state?: unknown } | null)?.state ?? "failed");
      if (state === "queued") summary.retried += 1;
      else if (state === "quarantined") summary.quarantined += 1;
      else summary.failed += 1;
    }
  }
  return summary;
}
