import { NextRequest } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getLandingPage, saveLandingPage } from "@/lib/landing";
import { revalidatePath, revalidateTag } from "next/cache";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  const landing = await getLandingPage();
  return apiSuccess({ landing });
}

export async function PATCH(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) {
    return apiError("FORBIDDEN", "Only the admin can edit the landing page.", 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (Object.hasOwn(body, "facebook_feed_settings") && !database.session.isFounder) {
      return apiError("FORBIDDEN", "Only the Founder can curate the Facebook profile feed.", 403);
    }
    const landing = await saveLandingPage(database.client, body);
    if (Object.hasOwn(body, "facebook_feed_settings")) {
      await logAuditEvent({ request, session: database.session, action: "facebook_feed_selection_updated", targetType: "landing_page", targetId: "home" });
    }
    revalidateTag("landing-page", "max");
    revalidatePath("/", "layout");
    return apiSuccess({ landing });
  } catch (error) {
    return toServerError(error);
  }
}
