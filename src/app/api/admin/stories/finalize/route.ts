import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { logAuditEvent } from "@/lib/audit";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { deleteR2Objects, getPublicUrl, headR2Object } from "@/lib/r2";
import { getSiteSettings } from "@/lib/site-settings";
import { ADMIN_STORY_COLUMNS, isProjectMediaUrl, keysBelongToStory, storyFinalizeSchema, validateStoryLimits } from "@/lib/admin-stories/contract";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can finalize stories.", 403);
  let cleanupKeys: string[] = [];
  try {
    const parsed = storyFinalizeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError("INVALID_INPUT", "The uploaded story metadata is invalid.", 400, parsed.error.flatten());
    const input = parsed.data;
    if (!keysBelongToStory(input.storyId, input.video.r2Key, input.poster.r2Key)) return apiError("INVALID_INPUT", "Upload keys do not belong to the same story.", 400);
    cleanupKeys = [input.video.r2Key, input.poster.r2Key];
    const settings = await getSiteSettings(database.client);
    const limitError = validateStoryLimits(input.video, { maxVideoSizeBytes: settings.max_video_size_mb * 1024 * 1024, maxDurationSeconds: settings.max_video_duration_seconds });
    if (limitError) {
      await deleteR2Objects(cleanupKeys); cleanupKeys = [];
      return apiError("INVALID_INPUT", limitError, 400);
    }
    const [videoHead, posterHead] = await Promise.all([headR2Object(input.video.r2Key), headR2Object(input.poster.r2Key)]);
    if (videoHead.contentLength !== input.video.size || videoHead.contentType?.toLowerCase() !== input.video.mimeType) {
      await deleteR2Objects(cleanupKeys); cleanupKeys = [];
      return apiError("UPLOAD_FAILED", "The uploaded video does not match its declared metadata.", 409);
    }
    if (posterHead.contentLength !== input.poster.size || posterHead.contentType?.toLowerCase() !== "image/webp") {
      await deleteR2Objects(cleanupKeys); cleanupKeys = [];
      return apiError("UPLOAD_FAILED", "The generated poster could not be verified.", 409);
    }
    const videoUrl = getPublicUrl(input.video.r2Key);
    const posterUrl = getPublicUrl(input.poster.r2Key);
    const mediaOrigin = getPublicUrl("");
    if (!isProjectMediaUrl(videoUrl, mediaOrigin) || !isProjectMediaUrl(posterUrl, mediaOrigin)) {
      await deleteR2Objects(cleanupKeys); cleanupKeys = [];
      return apiError("INVALID_INPUT", "Story media must use the configured project media domain.", 400);
    }
    const order = await database.client.from("admin_stories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    if (order.error) throw order.error;
    const result = await database.client.from("admin_stories").insert({ id: input.storyId, video_url: videoUrl, video_r2_key: input.video.r2Key, poster_url: posterUrl, poster_r2_key: input.poster.r2Key, caption: input.caption?.trim() || null, mime_type: input.video.mimeType, file_size: input.video.size, width: input.video.width, height: input.video.height, duration_seconds: input.video.durationSeconds, is_published: true, sort_order: Number(order.data?.sort_order ?? -1) + 1, created_by: database.session.userId }).select(ADMIN_STORY_COLUMNS).single();
    if (result.error) throw result.error;
    cleanupKeys = [];
    await logAuditEvent({ request, session: database.session, action: "admin_story_created", targetType: "admin_story", targetId: result.data.id, metadata: { mime_type: input.video.mimeType, file_size: input.video.size } });
    revalidateTag("admin-stories", "max"); revalidateTag("landing-page", "max"); revalidatePath("/");
    return apiSuccess({ story: result.data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (cleanupKeys.length) await deleteR2Objects(cleanupKeys).catch(() => undefined);
    return toServerError(error, request, "api.admin.stories.finalize");
  }
}
