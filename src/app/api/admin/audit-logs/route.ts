import { NextRequest } from "next/server";
import { classifyDataFailure } from "@/lib/app-failure";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const roleActions = [
  "grant_admin",
  "revoke_admin",
  "failed_grant_admin",
  "failed_revoke_admin",
  "unauthorized_role_change_attempt",
  "founder_protection_triggered",
];

export async function GET(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) {
    return apiError("FORBIDDEN", "Only the Founder can view audit logs.", 403);
  }
  const { client } = database;

  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 50));
    const filter = request.nextUrl.searchParams.get("filter") ?? "all";
    const offset = (page - 1) * limit;

    let query = client
      .from("audit_logs")
      .select("*", { count: "exact" })
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filter === "roles") {
      query = query.in("action", roleActions);
    }

    const { data, count, error } = await query;
    if (error) throw classifyDataFailure(error, "audit_logs.founder_list");

    const guestIds = Array.from(
      new Set((data ?? []).map((l: { guest_visitor_id?: string | null }) => l.guest_visitor_id).filter(Boolean))
    ) as string[];
    let guestMap: Record<string, { visitor_name: string; linked_user_id: string | null }> = {};
    if (guestIds.length > 0) {
      const { data: guests } = await client
        .from("guest_visitors")
        .select("id, visitor_name, linked_user_id")
        .in("id", guestIds);
      if (guests) {
        guestMap = guests.reduce((acc, g) => {
          acc[g.id] = { visitor_name: g.visitor_name, linked_user_id: g.linked_user_id };
          return acc;
        }, {} as Record<string, { visitor_name: string; linked_user_id: string | null }>);
      }
    }

    const enrichedLogs = (data ?? []).map((log: Record<string, any>) => ({
      ...log,
      guest_visitor_name: log.guest_visitor_id
        ? guestMap[log.guest_visitor_id]?.visitor_name ?? (log.metadata?.guest_name as string | undefined) ?? null
        : (log.metadata?.guest_name as string | undefined) ?? null,
    }));

    return apiSuccess(
      { logs: enrichedLogs, count: count ?? 0, page, limit },
      { headers: noStore },
    );
  } catch (error) {
    return toServerError(error, request, "api.admin.audit_logs");
  }
}
