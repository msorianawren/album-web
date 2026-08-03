import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { logAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { completeUploadFile } from "@/lib/media";
import { verifyAndQueueImageUpload } from "@/lib/media/processing-jobs";
import { scheduleQueuedImageProcessing } from "@/lib/media/schedule-processing";
import { getSiteSettings } from "@/lib/site-settings";
import { validateUploadMetadata } from "@/lib/upload-validation";
import { normalizeMedia } from "@/lib/albums";
import { projectPrivateMediaForClient } from "@/lib/private-media";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the admin can upload media.", 403);
  const { client, session } = database;
  try {
    const body = await request.json().catch(() => ({}));
    const mediaId = typeof body.mediaId === "string" ? body.mediaId : "";
    if (!uuidPattern.test(mediaId)) return apiError("INVALID_INPUT", "A valid media ID is required.", 400);

    const job = await client
      .from("media_processing_jobs")
      .select("media_id,album_id")
      .eq("media_id", mediaId)
      .maybeSingle();
    if (job.error) throw job.error;
    if (job.data) {
      const queued = await verifyAndQueueImageUpload(client, mediaId);
      scheduleQueuedImageProcessing(client, 2);
      await logAuditEvent({
        request,
        session,
        action: "admin_upload_media_queued",
        targetType: "album",
        targetId: job.data.album_id,
        metadata: { uploaded: 1, processing: "queued" },
      });
      revalidateTag(`album:${job.data.album_id}:media`, "max");
      revalidateTag("albums:public", "max");
      revalidatePath(`/albums/${job.data.album_id}`);
      // Fetch the full media row so the client can immediately surface it in the
      // media list with a processing indicator instead of showing "0 items".
      const mediaRow = await client
        .from("media")
        .select("*")
        .eq("id", mediaId)
        .maybeSingle();
      const mediaData = mediaRow.data 
        ? projectPrivateMediaForClient(normalizeMedia(mediaRow.data as any)) 
        : { id: mediaId, processing_status: queued.status };
      return apiSuccess(
        { media: mediaData, queued: queued.status !== "ready" },
        { status: queued.status === "ready" ? 200 : 202 },
      );
    }

    const albumId = typeof body.albumId === "string" ? body.albumId : "";
    const filename = typeof body.filename === "string" ? body.filename : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "";
    const size = Number(body.size);
    const settings = await getSiteSettings(client);
    const validation = validateUploadMetadata({
      fileName: filename,
      mimeType,
      size,
      options: { enableImageUploads: false, enableVideoUploads: settings.enable_video_uploads, maxVideoSizeBytes: settings.max_video_size_mb * 1024 * 1024 },
    });
    if (!validation.ok || validation.value.mediaType !== "video") {
      return apiError("INVALID_INPUT", "Image upload reservation was not found.", 400);
    }
    const r2Key = typeof body.r2Key === "string" ? body.r2Key : "";
    const expectedPrefix = `albums/${albumId}/videos/${mediaId}/original.`;
    if (!albumId || !r2Key.startsWith(expectedPrefix)) return apiError("INVALID_INPUT", "Invalid video upload key.", 400);
    const media = await completeUploadFile({ client, albumId, mediaId, r2Key, fileName: validation.value.safeName, mimeType, size });
    revalidateTag(`album:${albumId}:media`, "max");
    revalidateTag("albums:public", "max");
    revalidatePath(`/albums/${albumId}`);
    return apiSuccess({ media }, { status: 201 });
  } catch (error) {
    return toServerError(error, request, "api.upload.complete");
  }
}
