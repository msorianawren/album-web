import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const { data, error } = await supabase
      .from("album_invites")
      .select("*, albums(title)")
      .order("created_at", { ascending: false });

    if (error) {
      return apiError("SERVER_ERROR", error.message, 500);
    }

    return apiSuccess({ invites: data });
  } catch (error) {
    return toServerError(error);
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const body = await request.json();
    const { email, album_id, is_global } = body;

    if (!email || typeof email !== "string") {
      return apiError("INVALID_INPUT", "A valid email is required.", 400);
    }

    if (!is_global && !album_id) {
      return apiError("INVALID_INPUT", "Must specify either an album or set as global.", 400);
    }

    const { data, error } = await supabase
      .from("album_invites")
      .insert({
        email: email.toLowerCase(),
        album_id: is_global ? null : album_id,
        is_global: Boolean(is_global),
        created_by: adminCheck.userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // unique violation
        return apiError("CONFLICT", "This invite already exists.", 409);
      }
      return apiError("SERVER_ERROR", error.message, 500);
    }

    return apiSuccess({ invite: data });
  } catch (error) {
    return toServerError(error);
  }
}
