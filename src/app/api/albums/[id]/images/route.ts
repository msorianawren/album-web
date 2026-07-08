import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { uploadMediaFile } from "@/lib/media";
import { getAlbum } from "@/lib/albums";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { supabase } from "@/lib/supabase";
import { validateUploadFile } from "@/lib/upload-validation";

export const runtime = "nodejs";

interface ImagesRouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: ImagesRouteProps) {
  const { id } = await params;
  const session = await requireAdmin(request);
  const album = await getAlbum(id, { isAdmin: Boolean(session?.isAdmin) });

  if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
  if (album.locked) return apiSuccess({ media: [] });
  return apiSuccess({ media: album.media, download_allowed: album.download_allowed });
}

export async function POST(request: NextRequest, { params }: ImagesRouteProps) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can upload media.", 403);
  }

  try {
    const { id: albumId } = await params;
    const settings = await getSiteSettings();
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

    const formData = await request.formData();
    const files = formData
      .getAll("file")
      .concat(formData.getAll("files"))
      .filter((value): value is File => value instanceof File);

    if (!files.length) return apiError("INVALID_INPUT", "file is required.", 400);
    if (files.length > settings.max_upload_files_per_batch) {
      return apiError(
        "INVALID_INPUT",
        `Upload up to ${settings.max_upload_files_per_batch} files at a time.`,
        400,
      );
    }

    const { data: existingMedia } = await supabase
      .from("media")
      .select("file_size")
      .eq("album_id", albumId);
    const currentAlbumBytes = (existingMedia ?? []).reduce(
      (sum, item) => sum + Number(item.file_size ?? 0),
      0,
    );
    const incomingBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (currentAlbumBytes + incomingBytes > settings.max_album_storage_mb * 1024 * 1024) {
      return apiError("PAYLOAD_TOO_LARGE", "This upload would exceed the album storage limit.", 413);
    }

    const media = [];
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
        media.push(
          await uploadMediaFile({
            albumId,
            fileName: validation.value.safeName,
            mimeType: file.type,
            buffer,
            settings,
          }),
        );
      } catch (error) {
        failed.push({
          fileName: file.name,
          code: "UPLOAD_FAILED",
          message: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }

    if (!media.length && failed.length) {
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
        uploaded: media.length,
        failed: failed.length,
        failedFiles: failed.map((item) => ({
          fileName: item.fileName,
          code: item.code,
        })),
      },
    });

    return apiSuccess({ media, failed }, { status: failed.length ? 207 : 201 });
  } catch (error) {
    return toServerError(error);
  }
}
