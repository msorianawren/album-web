import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { getAboutProfile, saveAboutProfile } from "@/lib/about";

export async function GET(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the admin can read Studio about profile.", 403);

  const profile = await getAboutProfile();
  return apiSuccess({ profile });
}

export async function PATCH(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the admin can update Studio about profile.", 403);

  try {
    const body = await request.json().catch(() => ({}));
    const profile = await saveAboutProfile(database.client, body);
    revalidatePath("/", "layout");
    return apiSuccess({ profile });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError("INVALID_INPUT", "Invalid profile payload.", 400, error.flatten());
    }
    return toServerError(error);
  }
}
