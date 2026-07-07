import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can request upload URLs.", 403);
  }

  return apiError(
    "FORBIDDEN",
    "Direct browser uploads are disabled. Use /api/upload so files are validated before reaching storage.",
    403,
  );
}
