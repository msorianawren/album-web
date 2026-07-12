import { NextRequest } from "next/server";
import { getAlbum } from "@/lib/albums";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { deleteR2Objects } from "@/lib/r2";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { supabase } from "@/lib/supabase";
import { albumUpdateSchema } from "@/lib/validators";

interface AlbumRouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: AlbumRouteProps) {
  const { id } = await params;
  const session = await requireAdmin(request);
  const album = await getAlbum(id, { isAdmin: Boolean(session?.isAdmin) });

  if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
  return apiSuccess({ album });
}

export async function PATCH(request: NextRequest, { params }: AlbumRouteProps) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can update albums.", 403);
  }

  try {
    const { id } = await params;
    const settings = await getSiteSettings();
    const rate = await enforceRateLimit({
      request,
      session,
      policy: {
        action: "admin_update_album",
        limit: settings.admin_mutation_rate_limit_count,
        windowSeconds: settings.admin_mutation_rate_limit_window_seconds,
      },
    });

    if (!rate.allowed) {
      return apiError("RATE_LIMITED", "Too many admin changes. Please wait before trying again.", 429);
    }

    const parsed = albumUpdateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return apiError(
        "INVALID_INPUT",
        "Invalid album update.",
        400,
        parsed.error.flatten(),
      );
    }

    const { status, ...otherFields } = parsed.data;

    let data;
    if (Object.keys(otherFields).length > 0) {
      const { data: updatedData, error } = await supabase
        .from("albums")
        .update(otherFields)
        .eq("id", id)
        .select("*")
        .single();
      
      if (error) return apiError("SERVER_ERROR", error.message, 500);
      data = updatedData;
    }

    if (status) {
      const { error } = await supabase.rpc("change_album_status", {
        p_album_id: id,
        p_new_status: status,
        p_user_id: session.userId,
      });
      if (error) return apiError("SERVER_ERROR", "Failed to update album status and ordering", 500);
      
      // Refetch to get the latest row with new order
      const { data: finalData } = await supabase.from("albums").select("*").eq("id", id).single();
      data = finalData;
    }

    if (!data) return apiError("SERVER_ERROR", "Failed to update album", 500);
    await logAuditEvent({
      request,
      session,
      action: "admin_update_album",
      targetType: "album",
      targetId: id,
      metadata: { changedFields: Object.keys(parsed.data) },
    });
    return apiSuccess({ album: data });
  } catch (error) {
    return toServerError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: AlbumRouteProps) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can delete albums.", 403);
  }

  const { id } = await params;
  const settings = await getSiteSettings();
  const rate = await enforceRateLimit({
    request,
    session,
    policy: {
      action: "admin_delete_album",
      limit: settings.admin_mutation_rate_limit_count,
      windowSeconds: settings.admin_mutation_rate_limit_window_seconds,
    },
  });

  if (!rate.allowed) {
    return apiError("RATE_LIMITED", "Too many admin changes. Please wait before trying again.", 429);
  }

  if (settings.enable_soft_delete) {
    const { error } = await supabase
      .from("albums")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: session.userId,
        delete_reason: "Deleted from Studio",
        status: "private",
      })
      .eq("id", id);

    if (error) return apiError("SERVER_ERROR", error.message, 500);
    await logAuditEvent({
      request,
      session,
      action: "admin_soft_delete_album",
      targetType: "album",
      targetId: id,
      metadata: { retentionDays: settings.soft_delete_retention_days },
    });
    return apiSuccess({ deleted: true, softDeleted: true });
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .from("media")
    .select("r2_key,thumbnail_r2_key,medium_r2_key,poster_r2_key")
    .eq("album_id", id);

  if (mediaError) return apiError("SERVER_ERROR", mediaError.message, 500);

  const { error } = await supabase.from("albums").delete().eq("id", id);
  if (error) return apiError("SERVER_ERROR", error.message, 500);

  try {
    await deleteR2Objects(
      (mediaRows ?? []).flatMap((item) => [
        item.r2_key,
        item.thumbnail_r2_key,
        item.medium_r2_key,
        item.poster_r2_key,
      ]),
    );
  } catch {
    return apiError(
      "UPLOAD_FAILED",
      "Album was deleted, but some R2 objects may still need cleanup.",
      500,
    );
  }

  await logAuditEvent({
    request,
    session,
    action: "admin_delete_album",
    targetType: "album",
    targetId: id,
    metadata: { removedR2Objects: true },
  });
  return apiSuccess({ deleted: true });
}
