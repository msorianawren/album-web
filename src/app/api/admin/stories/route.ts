import { NextRequest } from "next/server";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSiteSettings } from "@/lib/site-settings";
import { ADMIN_STORY_COLUMNS } from "@/lib/admin-stories/contract";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can manage stories.", 403);
  try {
    const [storiesResult, settings] = await Promise.all([
      database.client.from("admin_stories").select(ADMIN_STORY_COLUMNS).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      getSiteSettings(database.client),
    ]);
    if (storiesResult.error) throw storiesResult.error;
    await logAuditEvent({ request, session: database.session, action: "admin_stories_viewed", targetType: "admin_story", metadata: { count: storiesResult.data?.length ?? 0 } });
    return apiSuccess({ stories: storiesResult.data ?? [], limits: { maxVideoSizeBytes: settings.max_video_size_mb * 1024 * 1024, maxDurationSeconds: settings.max_video_duration_seconds } }, { headers: noStore });
  } catch (error) {
    return toServerError(error, request, "api.admin.stories.list");
  }
}
