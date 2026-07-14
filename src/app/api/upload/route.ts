import { NextRequest } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { logAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { uploadMediaFile } from "@/lib/media";
import { enqueueImageBuffer } from "@/lib/media/processing-jobs";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { validateUploadFile } from "@/lib/upload-validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) {
    return apiError("FORBIDDEN", "Only the admin can upload media.", 403);
  }
  const { session, client } = database;

  try {
    const formData = await request.formData();
    const settings = await getSiteSettings(client);
    const rate = await enforceRateLimit({
      request,
      session,
      policy: {
        action: "upload_media",
        limit: settings.upload_rate_limit_count,
        windowSeconds: settings.upload_rate_limit_window_seconds,
      },
    });

    if (!rate.allowed) {
      return apiError("RATE_LIMITED", "Too many upload requests. Please wait before trying again.", 429);
    }

    const albumId = String(formData.get("albumId") ?? "");
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (!albumId || !files.length) {
      return apiError("INVALID_INPUT", "albumId and files[] are required.", 400);
    }

    if (files.length > settings.max_upload_files_per_batch) {
      return apiError(
        "INVALID_INPUT",
        `Upload up to ${settings.max_upload_files_per_batch} files at a time.`,
        400,
      );
    }

    const storage = await client.rpc("get_album_storage_bytes", { target_album_id: albumId });
    if (storage.error) throw storage.error;
    const currentAlbumBytes = Number(storage.data ?? 0);
    const incomingBytes = files.reduce((sum, file) => sum + file.size, 0);

    // DEPRECATED: This proxy upload route is capped at 4MB to prevent Vercel request body limits.
    // Use /api/upload/presign and direct storage uploads instead.
    const maxLegacySizeBytes = 4 * 1024 * 1024;
    if (incomingBytes > maxLegacySizeBytes) {
      return apiError(
        "PAYLOAD_TOO_LARGE",
        "File is too large for the proxy upload endpoint. Please use direct presigned R2 upload instead.",
        413
      );
    }

    if (currentAlbumBytes + incomingBytes > settings.max_album_storage_mb * 1024 * 1024) {
      return apiError("PAYLOAD_TOO_LARGE", "This upload would exceed the album storage limit.", 413);
    }

    const uploaded = [];
    const failed = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const validation = validateUploadFile({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        buffer,
        options: {
          enableImageUploads: settings.enable_image_uploads,
          enableVideoUploads: settings.enable_video_uploads,
          maxImageSizeBytes: settings.max_image_size_mb * 1024 * 1024,
          maxVideoSizeBytes: settings.max_video_size_mb * 1024 * 1024,
        },
      });

      if (!validation.ok) {
        failed.push({
          fileName: file.name,
          code: validation.code,
          message: validation.message,
        });
        continue;
      }

      try {
        if (validation.value.mediaType === "image") {
          const queued = await enqueueImageBuffer({
            client,
            albumId,
            fileName: validation.value.safeName,
            mimeType: file.type,
            buffer,
          });
          uploaded.push({ id: queued.mediaId, processing_status: queued.status });
        } else {
          uploaded.push(await uploadMediaFile({
            client,
            albumId,
            fileName: validation.value.safeName,
            mimeType: file.type,
            buffer,
            settings,
          }));
        }
      } catch (error) {
        failed.push({
          fileName: file.name,
          code: "UPLOAD_FAILED",
          message: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }

    if (!uploaded.length && failed.length) {
      const first = failed[0];
      await logAuditEvent({
        request,
        session,
        action: "admin_upload_media_failed",
        targetType: "album",
        targetId: albumId,
        metadata: {
          failed: failed.length,
          failedFiles: failed.map((item) => ({
            fileName: item.fileName,
            code: item.code,
          })),
        },
      });
      return apiError(
        first.code === "PAYLOAD_TOO_LARGE" ? "PAYLOAD_TOO_LARGE" : first.code === "UNSUPPORTED_MEDIA_TYPE" ? "UNSUPPORTED_MEDIA_TYPE" : "UPLOAD_FAILED",
        first.message,
        first.code === "PAYLOAD_TOO_LARGE" ? 413 : first.code === "UNSUPPORTED_MEDIA_TYPE" ? 415 : 500,
        { failed },
      );
    }

    await logAuditEvent({
      request,
      session,
      action: "admin_upload_media",
      targetType: "album",
      targetId: albumId,
      metadata: {
        uploaded: uploaded.length,
        failed: failed.length,
        failedFiles: failed.map((item) => ({
          fileName: item.fileName,
          code: item.code,
        })),
      },
    });

    return apiSuccess({ media: uploaded, failed }, { status: failed.length ? 207 : 201 });
  } catch (error) {
    return toServerError(error);
  }
}
