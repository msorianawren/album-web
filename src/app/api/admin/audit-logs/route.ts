import { NextRequest } from "next/server";
import { requireFounder } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const session = await requireFounder(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the Founder can view audit logs.", 403);
  }

  try {
    const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1") || 1;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50") || 50;
    const filter = request.nextUrl.searchParams.get("filter") ?? "all";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filter === "roles") {
      query = query.in("action", [
        "grant_admin",
        "revoke_admin",
        "failed_grant_admin",
        "failed_revoke_admin",
        "unauthorized_role_change_attempt",
        "founder_protection_triggered",
      ]);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return apiSuccess({ logs: data ?? [], count: count ?? 0 });
  } catch (error) {
    return toServerError(error);
  }
}
