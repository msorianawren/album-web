import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { grantAdminRole, logUnauthorizedRoleAttempt } from "@/lib/role-management";
import { enforceRateLimit } from "@/lib/security-rate-limit";

interface AdminGrantRouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: AdminGrantRouteProps) {
  const session = await getPublicSession(request);
  const { id } = await params;

  if (!session.isFounder) {
    await logUnauthorizedRoleAttempt({
      request,
      session,
      targetId: id,
      reason: "Only the Founder can grant admin rights.",
    });
    return apiError("FORBIDDEN", "Only the Founder can grant admin rights.", 403);
  }

  const rateLimit = await enforceRateLimit({
    request,
    session,
    policy: { action: "grant_admin", limit: 10, windowSeconds: 60 * 60 },
  });
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many admin role changes.", 429, {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : undefined;
    const result = await grantAdminRole({ request, session, targetId: id, reason });

    if (!result.ok) {
      return apiError(result.code === "NOT_FOUND" ? "NOT_FOUND" : result.code === "FORBIDDEN" ? "FORBIDDEN" : "SERVER_ERROR", result.message, result.code === "NOT_FOUND" ? 404 : result.code === "FORBIDDEN" ? 403 : 500);
    }

    return apiSuccess({ user: result.user });
  } catch (error) {
    return toServerError(error);
  }
}
