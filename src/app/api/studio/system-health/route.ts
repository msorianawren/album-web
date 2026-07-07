import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSystemHealth } from "@/lib/studio-data";

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return apiError("FORBIDDEN", "Only the admin can read system health.", 403);

  try {
    const health = await getSystemHealth(session);
    return apiSuccess({ health });
  } catch (error) {
    return toServerError(error);
  }
}
