import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const session = await getPublicSession();
  if (!session) {
    return apiError("UNAUTHENTICATED", "Not authorized.", 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const excludeId = searchParams.get("excludeId");

    if (!slug) {
      return apiError("INVALID_INPUT", "Slug is required.", 400);
    }

    let query = supabase.from("albums").select("id").eq("slug", slug).limit(1);

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
