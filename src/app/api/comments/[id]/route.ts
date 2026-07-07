import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

interface CommentRouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: CommentRouteProps) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can moderate comments.", 403);
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (typeof body.is_hidden !== "boolean") {
      return apiError("INVALID_INPUT", "is_hidden must be true or false.", 400);
    }

    const { data, error } = await supabase
      .from("comments")
      .update({ is_hidden: body.is_hidden })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return apiError("SERVER_ERROR", error.message, 500);
    return apiSuccess({ comment: data });
  } catch (error) {
    return toServerError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: CommentRouteProps) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can delete comments.", 403);
  }

  const { id } = await params;
  const { error } = await supabase.from("comments").delete().eq("id", id);

  if (error) return apiError("SERVER_ERROR", error.message, 500);
  return apiSuccess({ deleted: true });
}
