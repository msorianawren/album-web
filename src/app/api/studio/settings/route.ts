import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSiteSettings, saveSiteSettings } from "@/lib/site-settings";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the admin can read Studio settings.", 403);

  const settings = await getSiteSettings();
  return apiSuccess({ settings });
}

export async function PATCH(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the admin can update Studio settings.", 403);

  try {
    const body = await request.json().catch(() => ({}));
    const settings = await saveSiteSettings(database.client, body);
    revalidatePath("/", "layout");
    return apiSuccess({ settings });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError("INVALID_INPUT", "Invalid settings payload.", 400, error.flatten());
    }
    return toServerError(error);
  }
}
