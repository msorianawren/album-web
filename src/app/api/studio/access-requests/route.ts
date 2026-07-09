import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const { data, error } = await supabase
      .from("album_access_requests")
      .select("*, albums(title)")
      .order("created_at", { ascending: false });

    if (error) {
      return apiError("SERVER_ERROR", error.message, 500);
    }

    return apiSuccess({ requests: data });
  } catch (error) {
    return toServerError(error);
  }
}
