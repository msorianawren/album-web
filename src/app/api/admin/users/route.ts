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
    const [users, roleLogs] = await Promise.all([
      listAdminUsers(search),
      getRoleAuditLogs(80),
    ]);
    return apiSuccess({ users, roleLogs });
  } catch (error) {
    return toServerError(error);
  }
}
