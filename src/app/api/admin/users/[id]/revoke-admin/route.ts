import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { logUnauthorizedRoleAttempt, revokeAdminRole } from "@/lib/role-management";
import { enforceRateLimit } from "@/lib/security-rate-limit";

interface AdminRevokeRouteProps {
  params: Promise<{ id: string }>;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function roleErrorResponse(result: { code: string; message: string }) {
  if (result.code === "NOT_FOUND") return apiError("NOT_FOUND", result.message, 404);
  if (result.code === "FORBIDDEN") return apiError("FORBIDDEN", result.message, 403);
  return apiError("SERVER_ERROR", result.message, 500);
}

export async function POST(request: NextRequest, { params }: AdminRevokeRouteProps) {
  const session = await getPublicSession(request);
  const { id } = await params;

  if (!session.isFounder) {
    await logUnauthorizedRoleAttempt({
      request,
      session,
      targetId: id,
      reason: "Only the Founder can revoke admin rights.",
    });
    return apiError("FORBIDDEN", "Only the Founder can revoke admin rights.", 403);
  }

  if (!isUuid(id)) {
    return apiError("INVALID_INPUT", "Invalid user ID.", 400);
  }

  const rateLimit = await enforceRateLimit({
    request,
    session,
    policy: { action: "revoke_admin", limit: 10, windowSeconds: 60 * 60 },
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
    const result = await revokeAdminRole({ request, session, targetId: id, reason });

    if (!result.ok) {
      return roleErrorResponse(result);
    }

    return apiSuccess({ user: result.user });
  } catch (error) {
    return toServerError(error);
  }
}
