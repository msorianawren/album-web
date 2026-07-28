import { NextRequest } from "next/server";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { listMetaFeedItems } from "@/lib/meta/data";

export async function GET(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can view Facebook feed items.", 403);
  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 24));
    const search = request.nextUrl.searchParams.get("search") ?? "";
    return apiSuccess(await listMetaFeedItems({ page, limit, search }));
  } catch (error) { return toServerError(error, request, "api.meta.feed"); }
}
