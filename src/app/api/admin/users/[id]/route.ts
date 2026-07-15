import { NextRequest } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { classifyDataFailure } from "@/lib/app-failure";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { createAccountBlockedNotification, createAccountUnblockedNotification } from "@/lib/notifications";

interface AdminUserRouteProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const userIdSchema = z.string().uuid();
const userBlockSchema = z.object({
  is_blocked: z.boolean(),
  blocked_reason: z.string().trim().max(500).optional().nullable(),
}).strict();

export async function PATCH(request: NextRequest, { params }: AdminUserRouteProps) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) {
    return apiError("FORBIDDEN", "Only the admin can manage users.", 403);
  }
  const { session, client } = database;

  try {
    const idResult = userIdSchema.safeParse((await params).id);
    if (!idResult.success) {
      return apiError("INVALID_INPUT", "Invalid user ID.", 400);
    }
    const id = idResult.data;
    const bodyResult = userBlockSchema.safeParse(await request.json().catch(() => null));
    if (!bodyResult.success) {
      return apiError("INVALID_INPUT", "A valid block state is required.", 400);
    }
    const isBlocked = bodyResult.data.is_blocked;
    const reason =
      bodyResult.data.blocked_reason
        ? bodyResult.data.blocked_reason
        : "Your behavior on this website has not been in good faith.";

    if (session.userId === id && isBlocked) {
      return apiError("INVALID_INPUT", "The admin account cannot block itself.", 400);
    }

    const { data: targetData, error: targetError } = await client
      .from("user_profiles")
      .select("*")
      .eq("user_id", id)
      .maybeSingle();
    if (targetError) {
      throw classifyDataFailure(targetError, "users.admin_target_read");
    }
    if (!targetData) {
      return apiError("NOT_FOUND", "User profile not found.", 404);
    }
    const targetIsFounder =
      targetData.role === "founder" ||
      (Boolean(process.env.DEFAULT_OWNER_ID) && targetData.user_id === process.env.DEFAULT_OWNER_ID);
    if (targetIsFounder && session.userId !== id) {
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

    const { data, error } = await client
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

    if (error) {
      throw classifyDataFailure(error, "users.admin_block_update");
    }
    if (!data) {
      return apiError("NOT_FOUND", "User profile not found.", 404);
    }

    await logAuditEvent({
      request,
      session,
      action: isBlocked ? "admin_block_user" : "admin_unblock_user",
      targetType: "user",
      targetId: id,
      metadata: { reason: isBlocked ? reason : null },
    });

    if (isBlocked) {
      await createAccountBlockedNotification({
        recipientUserId: id,
        reason,
        request,
        actorSession: session,
      });
    } else {
      await createAccountUnblockedNotification({
        recipientUserId: id,
        request,
        actorSession: session,
      });
    }

    return apiSuccess({ user: data }, { headers: noStore });
  } catch (error) {
    return toServerError(error);
  }
}
