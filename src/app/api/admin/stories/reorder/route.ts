import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { logAuditEvent } from "@/lib/audit";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { storyReorderSchema } from "@/lib/admin-stories/contract";

export async function POST(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can reorder stories.", 403);
  try {
    const parsed = storyReorderSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError("INVALID_INPUT", "A unique ordered story ID list is required.", 400);
    const result = await database.client.rpc("reorder_admin_stories", { story_ids: parsed.data.ids });
    if (result.error) throw result.error;
    await logAuditEvent({ request, session: database.session, action: "admin_stories_reordered", targetType: "admin_story", metadata: { count: parsed.data.ids.length } });
    revalidateTag("admin-stories", "max"); revalidateTag("landing-page", "max"); revalidatePath("/");
    return apiSuccess({ ids: parsed.data.ids }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return toServerError(error, request, "api.admin.stories.reorder");
  }
}
