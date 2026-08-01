import { NextRequest } from "next/server";
import { logAuditEvent } from "@/lib/audit";
import { keysBelongToStory, storyCancelSchema } from "@/lib/admin-stories/contract";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { deleteR2Objects } from "@/lib/r2";

export async function POST(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can cancel story uploads.", 403);
  try {
    const parsed = storyCancelSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError("INVALID_INPUT", "Valid upload keys are required.", 400);
    if (!keysBelongToStory(parsed.data.storyId, parsed.data.videoR2Key, parsed.data.posterR2Key)) {
      return apiError("INVALID_INPUT", "Valid upload keys are required.", 400);
    }
    const existing = await database.client.from("admin_stories").select("id").eq("id", parsed.data.storyId).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return apiError("CONFLICT", "This upload has already been finalized.", 409);
    await deleteR2Objects([parsed.data.videoR2Key, parsed.data.posterR2Key]);
    await logAuditEvent({ request, session: database.session, action: "admin_story_upload_cancelled", targetType: "admin_story", targetId: parsed.data.storyId });
    return apiSuccess({ storyId: parsed.data.storyId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toServerError(error, request, "api.admin.stories.cancel");
  }
}
