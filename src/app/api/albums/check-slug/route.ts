import { NextRequest } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) {
    return apiError("FORBIDDEN", "Only the admin can check album slugs.", 403);
  }

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const excludeId = searchParams.get("excludeId");

    if (!slug) {
      return apiError("INVALID_INPUT", "Slug is required.", 400);
    }

    let query = database.client.from("albums").select("id").eq("slug", slug).limit(1);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const exists = data && data.length > 0;

    return apiSuccess({ exists });
  } catch (error) {
    return toServerError(error);
  }
}
