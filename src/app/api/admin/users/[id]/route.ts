import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getAdminProfile } from "@/lib/role-management";
import { supabase } from "@/lib/supabase";

interface AdminUserRouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: AdminUserRouteProps) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can manage users.", 403);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const isBlocked = Boolean(body.is_blocked);
    const reason =
      typeof body.blocked_reason === "string" && body.blocked_reason.trim()
        ? body.blocked_reason.trim()
        : "Your behavior on this website has not been in good faith.";

    if (session.userId === id && isBlocked) {
      return apiError("INVALID_INPUT", "The admin account cannot block itself.", 400);
    }

    const targetProfile = await getAdminProfile(id);
    if (targetProfile?.role === "founder" && session.userId !== id) {
      await logAuditEvent({
        request,
        session,
        action: "founder_protection_triggered",
        targetType: "user",
        targetId: id,
        metadata: {
          attempted_action: isBlocked ? "block_founder" : "unblock_founder",
          result: "failed",
          failure_reason: "Founder account cannot be restricted by another admin.",
        },
      });
      return apiError("FORBIDDEN", "Founder account cannot be restricted by another admin.", 403);
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        is_blocked: isBlocked,
        blocked_reason: isBlocked ? reason : null,
        blocked_at: isBlocked ? new Date().toISOString() : null,
        blocked_by: isBlocked ? session.userId : null,
      })
      .eq("user_id", id)
      .select("*")
      .single();

    if (error || !data) {
      return apiError("NOT_FOUND", error?.message ?? "User profile not found.", 404);
    }

    await logAuditEvent({
      request,
      session,
      action: isBlocked ? "admin_block_user" : "admin_unblock_user",
      targetType: "user",
      targetId: id,
      metadata: { reason: isBlocked ? reason : null },
    });

    return apiSuccess({ user: data });
  } catch (error) {
    return toServerError(error);
  }
}
