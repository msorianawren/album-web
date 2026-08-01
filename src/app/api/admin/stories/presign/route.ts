import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getPresignedPutUrl, getPublicUrl } from "@/lib/r2";
import { getSiteSettings } from "@/lib/site-settings";
import { storyPresignSchema, validateStoryLimits } from "@/lib/admin-stories/contract";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can upload stories.", 403);
  try {
    const parsed = storyPresignSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError("INVALID_INPUT", "Valid MP4/WebM metadata is required.", 400, parsed.error.flatten());
    const settings = await getSiteSettings(database.client);
    const limitError = validateStoryLimits(parsed.data.video, { maxVideoSizeBytes: settings.max_video_size_mb * 1024 * 1024, maxDurationSeconds: settings.max_video_duration_seconds });
    if (limitError) return apiError(parsed.data.video.size > settings.max_video_size_mb * 1024 * 1024 ? "PAYLOAD_TOO_LARGE" : "INVALID_INPUT", limitError, 400);
    const storyId = randomUUID();
    const extension = parsed.data.video.mimeType === "video/mp4" ? "mp4" : "webm";
    const videoR2Key = `landing/stories/${storyId}/video.${extension}`;
    const posterR2Key = `landing/stories/${storyId}/poster.webp`;
    const [videoUploadUrl, posterUploadUrl] = await Promise.all([
      getPresignedPutUrl({ key: videoR2Key, contentType: parsed.data.video.mimeType, expiresIn: 600 }),
      getPresignedPutUrl({ key: posterR2Key, contentType: "image/webp", expiresIn: 600 }),
    ]);
    await logAuditEvent({ request, session: database.session, action: "admin_story_upload_presigned", targetType: "admin_story", targetId: storyId, metadata: { mime_type: parsed.data.video.mimeType, file_size: parsed.data.video.size } });
    return apiSuccess({ storyId, video: { uploadUrl: videoUploadUrl, r2Key: videoR2Key, publicUrl: getPublicUrl(videoR2Key) }, poster: { uploadUrl: posterUploadUrl, r2Key: posterR2Key, publicUrl: getPublicUrl(posterR2Key) }, expiresIn: 600 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toServerError(error, request, "api.admin.stories.presign");
  }
}
