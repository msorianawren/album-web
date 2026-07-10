import { NextRequest } from "next/server";
import { requireFounder } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { listAdminUsers, getRoleAuditLogs } from "@/lib/role-management";

export async function GET(request: NextRequest) {
  const session = await requireFounder(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the Founder can view role management users.", 403);
  }

  try {
    const search = request.nextUrl.searchParams.get("q") ?? "";
    const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1") || 1;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "30") || 30;
    const filter = request.nextUrl.searchParams.get("filter") ?? "all";
    
    const [{ users, count }, roleLogs] = await Promise.all([
      listAdminUsers(search, page, limit, filter),
      getRoleAuditLogs(80),
    ]);
    return apiSuccess({ users, count, roleLogs });
  } catch (error) {
    return toServerError(error);
  }
}
