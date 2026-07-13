import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const { id } = await params;
    if (!id) {
      return apiError("INVALID_INPUT", "Missing invite ID.", 400);
    }

    const { error } = await supabase
      .from("album_invites")
      .delete()
      .eq("id", id);

    if (error) {
      return apiError("SERVER_ERROR", error.message, 500);
    }

    return apiSuccess({ success: true });
  } catch (error) {
    return toServerError(error);
  }
}
