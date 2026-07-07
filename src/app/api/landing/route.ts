import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getLandingPage, saveLandingPage } from "@/lib/landing";

export async function GET() {
  const landing = await getLandingPage();
  return apiSuccess({ landing });
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can edit the landing page.", 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const landing = await saveLandingPage(body);
    return apiSuccess({ landing });
  } catch (error) {
    return toServerError(error);
  }
}
