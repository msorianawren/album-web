import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { reserveImageProcessingUpload } from "@/lib/media/processing-jobs";
import { getPresignedPutUrl, getPublicUrl } from "@/lib/r2";
import { getSiteSettings } from "@/lib/site-settings";
import { validateUploadMetadata } from "@/lib/upload-validation";

export const runtime = "nodejs";

function extensionFromMime(mimeType: string) {
  return (mimeType.split("/").at(1) ?? "bin").replace("jpeg", "jpg").replace("quicktime", "mov");
}

export async function POST(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the admin can upload media.", 403);
  const { client } = database;
  try {
    const body = await request.json().catch(() => ({}));
    const albumId = typeof body.albumId === "string" ? body.albumId : "";
    const filename = typeof body.filename === "string" ? body.filename : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "";
    const size = Number(body.size);
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

    const mediaId = randomUUID();
    const r2Key = `albums/${albumId}/videos/${mediaId}/original.${extensionFromMime(mimeType)}`;
    const uploadUrl = await getPresignedPutUrl({ key: r2Key, contentType: mimeType, expiresIn: 300 });
    return apiSuccess({
      mediaId,
      uploadUrl,
      r2Key,
      publicUrl: getPublicUrl(r2Key),
      processingMode: "legacy-video",
      expiresIn: 300,
    });
  } catch (error) {
    return toServerError(error, request, "api.upload.presign");
  }
}
