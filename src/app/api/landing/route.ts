import { NextRequest } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getLandingPage, saveLandingPage } from "@/lib/landing";
import { revalidatePath } from "next/cache";

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
    const landing = await saveLandingPage(database.client, body);
    revalidatePath("/", "layout");
    return apiSuccess({ landing });
  } catch (error) {
    return toServerError(error);
  }
}
