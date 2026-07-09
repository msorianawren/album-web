import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSiteSettings } from "@/lib/site-settings";
import { completeUploadFile } from "@/lib/media";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can upload media.", 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      albumId,
      mediaId,
      r2Key,
      filename,
      size,
      mimeType,
      mediaType,
      width,
      height,
      durationSeconds,
    } = body;

    if (!albumId || !mediaId || !r2Key || !filename || !size || !mimeType || !mediaType) {
      return apiError("INVALID_INPUT", "Missing required fields for upload completion.", 400);
    }

    const settings = await getSiteSettings();

    const media = await completeUploadFile({
      albumId,
      mediaId,
      r2Key,
      fileName: filename,
      mimeType,
      size,
      settings,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
    });

    await logAuditEvent({
      request,
      session,
      action: "admin_upload_media",
      targetType: "album",
      targetId: albumId,
      metadata: {
        uploaded: 1,
        failed: 0,
        failedFiles: [],
      },
    });

    return apiSuccess({ media }, { status: 201 });
  } catch (error) {
    return toServerError(error);
  }
}
