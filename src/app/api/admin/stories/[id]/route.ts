import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { ADMIN_STORY_COLUMNS, storyPatchSchema } from "@/lib/admin-stories/contract";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { deleteR2Objects } from "@/lib/r2";

interface StoryRouteProps { params: Promise<{ id: string }> }
const idSchema = z.string().uuid();
function refreshLanding() { revalidateTag("admin-stories", "max"); revalidateTag("landing-page", "max"); revalidatePath("/"); }

export async function PATCH(request: NextRequest, { params }: StoryRouteProps) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can update stories.", 403);
  try {
    const id = idSchema.safeParse((await params).id);
    const input = storyPatchSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !input.success) return apiError("INVALID_INPUT", "A valid story update is required.", 400);
    const values = {
      ...(input.data.is_published !== undefined ? { is_published: input.data.is_published } : {}),
      ...(input.data.caption !== undefined ? { caption: input.data.caption?.trim() || null } : {}),
    };
    const result = await database.client.from("admin_stories").update(values).eq("id", id.data).select(ADMIN_STORY_COLUMNS).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return apiError("NOT_FOUND", "Story not found.", 404);
    await logAuditEvent({ request, session: database.session, action: input.data.is_published === undefined ? "admin_story_updated" : input.data.is_published ? "admin_story_published" : "admin_story_hidden", targetType: "admin_story", targetId: id.data });
    refreshLanding();
    return apiSuccess({ story: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toServerError(error, request, "api.admin.stories.update");
  }
}

export async function DELETE(request: NextRequest, { params }: StoryRouteProps) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can delete stories.", 403);
  try {
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return apiError("INVALID_INPUT", "A valid story ID is required.", 400);
    const found = await database.client.from("admin_stories").select("id,video_r2_key,poster_r2_key,is_published").eq("id", id.data).maybeSingle();
    if (found.error) throw found.error;
    if (!found.data) return apiError("NOT_FOUND", "Story not found.", 404);
    const hidden = await database.client.from("admin_stories").update({ is_published: false }).eq("id", id.data);
    if (hidden.error) throw hidden.error;
    refreshLanding();
    if (!found.data.video_r2_key || !found.data.poster_r2_key) {
      await logAuditEvent({ request, session: database.session, action: "admin_story_delete_cleanup_failed", targetType: "admin_story", targetId: id.data, metadata: { reason: "legacy_storage_keys_missing" } });
      return apiError("CONFLICT", "This legacy story was hidden, but its storage keys are missing. Reconcile the keys before retrying deletion.", 409);
    }
    try {
      await deleteR2Objects([found.data.video_r2_key, found.data.poster_r2_key]);
    } catch {
      await logAuditEvent({ request, session: database.session, action: "admin_story_delete_cleanup_failed", targetType: "admin_story", targetId: id.data, metadata: { reason: "r2_delete_failed" } });
      return apiError("UPLOAD_FAILED", "The story was hidden, but media cleanup failed. Retry deletion after storage recovers.", 502);
    }
    const removed = await database.client.from("admin_stories").delete().eq("id", id.data);
    if (removed.error) throw removed.error;
    await logAuditEvent({ request, session: database.session, action: "admin_story_deleted", targetType: "admin_story", targetId: id.data });
    refreshLanding();
    return apiSuccess({ id: id.data, cleanupPending: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toServerError(error, request, "api.admin.stories.delete");
  }
}
