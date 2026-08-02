import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSiteSettings, saveSiteSettings } from "@/lib/site-settings";
import { revalidatePath, revalidateTag } from "next/cache";

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
    revalidateTag("site-settings", "max");
    revalidatePath("/", "layout");

    const response = apiSuccess({ settings });
    const requireLogin = Boolean(
      (settings.advanced_settings as Record<string, unknown> | undefined)?.require_login_to_browse
    );
    response.cookies.set("_cfg_login_gate", requireLogin ? "1" : "0", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError("INVALID_INPUT", "Invalid settings payload.", 400, error.flatten());
    }
    return toServerError(error);
  }
}
