import { NextRequest } from "next/server";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { getSiteSettings } from "@/lib/site-settings";
import { decideAccessRequest } from "@/lib/access-request-workflow";
import type { PublicSession } from "@/lib/types";

type DueRequest = {
  id: string;
  requester_user_id: string | null;
  risk_flags: Record<string, boolean> | null;
};

const systemSession: PublicSession = {
  userId: null,
  email: null,
  displayName: "System",
  avatarUrl: null,
  role: "founder",
  isAdmin: true,
  isFounder: true,
  isBlocked: false,
  blockedReason: null,
};

function hasRiskFlags(flags: Record<string, boolean> | null) {
  if (!flags) return false;
  return Object.values(flags).some(Boolean);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (process.env.VERCEL_ENV === "production" && authHeader !== expectedAuth) {
    return apiError("UNAUTHENTICATED", "Invalid cron secret.", 401);
  }

  try {
    const settings = await getSiteSettings();
    const accessSettings = settings.advanced_settings?.access_requests as
      | {
          auto_approve_enabled?: boolean;
          high_risk_requires_manual_review?: boolean;
        }
      | undefined;

    if (accessSettings?.auto_approve_enabled === false) {
      return apiSuccess({ processed: 0, skipped: 0, status: "Auto approval is disabled." });
    }

    const highRiskRequiresManualReview = accessSettings?.high_risk_requires_manual_review !== false;
    const { data, error } = await supabase
      .from("album_access_requests")
      .select("id, requester_user_id, risk_flags")
      .eq("status", "pending")
      .lte("auto_approve_at", new Date().toISOString())
      .order("auto_approve_at", { ascending: true })
      .limit(50);

    if (error) return apiError("SERVER_ERROR", error.message, 500);

    const dueRequests = (data ?? []) as DueRequest[];
    const userIds = dueRequests.map((row) => row.requester_user_id).filter((id): id is string => Boolean(id));
    const blockedUsers = new Set<string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id,is_blocked")
        .in("user_id", userIds);
      for (const profile of profiles ?? []) {
        if (profile.is_blocked) blockedUsers.add(String(profile.user_id));
      }
    }

    let processed = 0;
    let skipped = 0;
    let manualReview = 0;

    for (const row of dueRequests) {
      if (row.requester_user_id && blockedUsers.has(row.requester_user_id)) {
        await supabase
          .from("album_access_requests")
          .update({
            status: "needs_manual_review",
            review_note: "User is blocked; auto approval skipped.",
            admin_note: "User is blocked; auto approval skipped.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        skipped += 1;
        manualReview += 1;
        continue;
      }

      if (highRiskRequiresManualReview && hasRiskFlags(row.risk_flags)) {
        await supabase
          .from("album_access_requests")
          .update({
            status: "needs_manual_review",
            review_note: "Risk flags require manual review before access can be approved.",
            admin_note: "Risk flags require manual review before access can be approved.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        skipped += 1;
        manualReview += 1;
        continue;
      }

      const result = await decideAccessRequest({
        requestId: row.id,
        decision: "auto_approved",
        actorSession: systemSession,
        note: "Automatically approved after 7 days without admin review.",
        request,
        system: true,
      });

      if (result.ok && result.status === "auto_approved") processed += 1;
      else skipped += 1;
    }

    return apiSuccess({ processed, skipped, manualReview });
  } catch (error) {
    return toServerError(error);
  }
}
