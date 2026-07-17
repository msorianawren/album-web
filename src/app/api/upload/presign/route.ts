import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { reserveImageProcessingUpload } from "@/lib/media/processing-jobs";
import { getPresignedPutUrl, getPublicUrl } from "@/lib/r2";
import { getSiteSettings } from "@/lib/site-settings";
import { validateUploadMetadata } from "@/lib/upload-validation";

export const runtime = "nodejs";
const PRESIGN_TIMEOUT_MS = 20_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

class PresignTimeoutError extends Error {}

async function withPresignTimeout<T>(task: () => Promise<T>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task(),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new PresignTimeoutError()), PRESIGN_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function extensionFromMime(mimeType: string) {
  return (mimeType.split("/").at(1) ?? "bin").replace("jpeg", "jpg").replace("quicktime", "mov");
}

export async function POST(request: NextRequest) {
  try {
    return await withPresignTimeout(async () => {
      const database = await getTrustedAdminDatabase(request);
      if (!database) return apiError("FORBIDDEN", "Only the admin can upload media.", 403);
      const { client } = database;
      const body = await request.json().catch(() => ({}));
      const albumId = typeof body.albumId === "string" ? body.albumId : "";
      const filename = typeof body.filename === "string" ? body.filename : "";
      const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "";
      const size = Number(body.size);
      const uploadId = typeof body.uploadId === "string" && uuidPattern.test(body.uploadId)
        ? body.uploadId
        : randomUUID();
      if (!albumId || !filename) return apiError("INVALID_INPUT", "Album and filename are required.", 400);

      const settings = await getSiteSettings(client);
      const validation = validateUploadMetadata({
        fileName: filename,
        mimeType,
        size,
        options: {
          enableImageUploads: settings.enable_image_uploads,
          enableVideoUploads: settings.enable_video_uploads,
          maxImageSizeBytes: settings.max_image_size_mb * 1024 * 1024,
          maxVideoSizeBytes: settings.max_video_size_mb * 1024 * 1024,
        },
      });
      if (!validation.ok) return apiError(validation.code, validation.message, validation.status);

      const album = await client.from("albums").select("id").eq("id", albumId).is("deleted_at", null).single();
      if (album.error || !album.data) return apiError("NOT_FOUND", "Album not found.", 404);
      const storage = await client.rpc("get_album_storage_bytes", { target_album_id: albumId });
      if (storage.error) throw storage.error;
      if (Number(storage.data ?? 0) + size > settings.max_album_storage_mb * 1024 * 1024) {
        return apiError("PAYLOAD_TOO_LARGE", "This upload would exceed the album storage limit.", 413);
      }

      if (validation.value.mediaType === "image") {
        const reservation = await reserveImageProcessingUpload({
          client,
          albumId,
          fileName: validation.value.safeName,
          mimeType,
          size,
          mediaId: uploadId,
          idempotencyKey: `upload-presign:${albumId}:${uploadId}`,
        });
        const uploadUrl = await getPresignedPutUrl({
          key: reservation.sourceKey,
          contentType: mimeType,
          expiresIn: 300,
          bucketRole: "private",
        });
        return apiSuccess({
          mediaId: reservation.mediaId,
          uploadUrl,
          processingMode: "async-image",
          expiresIn: 300,
        });
      }

      const r2Key = `albums/${albumId}/videos/${uploadId}/original.${extensionFromMime(mimeType)}`;
      const uploadUrl = await getPresignedPutUrl({ key: r2Key, contentType: mimeType, expiresIn: 300 });
      return apiSuccess({
        mediaId: uploadId,
        uploadUrl,
        r2Key,
        publicUrl: getPublicUrl(r2Key),
        processingMode: "legacy-video",
        expiresIn: 300,
      });
    });
  } catch (error) {
    if (error instanceof PresignTimeoutError) {
      return apiError("SERVER_ERROR", "Upload preparation timed out. Please retry this file.", 503);
    }
    return toServerError(error, request, "api.upload.presign");
  }
}
