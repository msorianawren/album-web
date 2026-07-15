import { NextRequest } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { classifyDataFailure } from "@/lib/app-failure";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSiteSettings } from "@/lib/site-settings";

interface CommentRouteProps {
  params: Promise<{ id: string }>;
}

const commentIdSchema = z.string().uuid();

export async function PATCH(request: NextRequest, { params }: CommentRouteProps) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) {
    return apiError("FORBIDDEN", "Only the admin can moderate comments.", 403);
  }
  const { session, client } = database;

  try {
    const idResult = commentIdSchema.safeParse((await params).id);
    if (!idResult.success) {
      return apiError("INVALID_INPUT", "Invalid comment id.", 400);
    }
    const id = idResult.data;
    const body = await request.json().catch(() => ({}));

    if (typeof body.is_hidden !== "boolean") {
      return apiError("INVALID_INPUT", "is_hidden must be true or false.", 400);
    }

    const { data, error } = await client
      .from("comments")
      .update({
        is_hidden: body.is_hidden,
        moderation_status: body.is_hidden ? "hidden" : "visible",
        moderation_reason: body.is_hidden ? "Hidden by admin" : null,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw classifyDataFailure(error, "comments.admin_visibility");
    }
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
  const database = await getTrustedAdminDatabase(request);
  if (!database) {
    return apiError("FORBIDDEN", "Only the admin can delete comments.", 403);
  }
  const { session, client } = database;

  const idResult = commentIdSchema.safeParse((await params).id);
  if (!idResult.success) {
    return apiError("INVALID_INPUT", "Invalid comment id.", 400);
  }
  const id = idResult.data;
  const settings = await getSiteSettings();
  if (settings.enable_soft_delete) {
    const { error } = await client
      .from("comments")
      .update({
        is_hidden: true,
        moderation_status: "deleted",
        deleted_at: new Date().toISOString(),
        deleted_by: session.userId,
        delete_reason: "Deleted from Studio",
      })
      .eq("id", id);

    if (error) {
      return toServerError(
        classifyDataFailure(error, "comments.admin_soft_delete"),
        request,
        "api.comments.delete",
      );
    }
    await logAuditEvent({
      request,
      session,
      action: "admin_soft_delete_comment",
      targetType: "comment",
      targetId: id,
    });
    return apiSuccess({ deleted: true, softDeleted: true });
  }

  const { error } = await client.from("comments").delete().eq("id", id);

  if (error) {
    return toServerError(
      classifyDataFailure(error, "comments.admin_delete"),
      request,
      "api.comments.delete",
    );
  }
  await logAuditEvent({
    request,
    session,
    action: "admin_delete_comment",
    targetType: "comment",
    targetId: id,
  });
  return apiSuccess({ deleted: true });
}
