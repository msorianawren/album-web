import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSiteSettings } from "@/lib/site-settings";
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
      .update({
        is_hidden: body.is_hidden,
        moderation_status: body.is_hidden ? "hidden" : "visible",
        moderation_reason: body.is_hidden ? "Hidden by admin" : null,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return apiError("SERVER_ERROR", error.message, 500);
    await logAuditEvent({
      request,
      session,
      action: body.is_hidden ? "admin_hide_comment" : "admin_restore_comment",
      targetType: "comment",
      targetId: id,
    });
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
  const settings = await getSiteSettings();
  if (settings.enable_soft_delete) {
    const { error } = await supabase
      .from("comments")
      .update({
        is_hidden: true,
        moderation_status: "deleted",
        deleted_at: new Date().toISOString(),
        deleted_by: session.userId,
        delete_reason: "Deleted from Studio",
      })
      .eq("id", id);

    if (error) return apiError("SERVER_ERROR", error.message, 500);
    await logAuditEvent({
      request,
      session,
      action: "admin_soft_delete_comment",
      targetType: "comment",
      targetId: id,
    });
    return apiSuccess({ deleted: true, softDeleted: true });
  }

  const { error } = await supabase.from("comments").delete().eq("id", id);

  if (error) return apiError("SERVER_ERROR", error.message, 500);
  await logAuditEvent({
    request,
    session,
    action: "admin_delete_comment",
    targetType: "comment",
    targetId: id,
  });
  return apiSuccess({ deleted: true });
}
