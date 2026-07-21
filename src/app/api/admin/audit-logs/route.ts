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

    return apiSuccess(
      { logs: data ?? [], count: count ?? 0, page, limit },
      { headers: noStore },
    );
  } catch (error) {
    return toServerError(error, request, "api.admin.audit_logs");
  }
}
