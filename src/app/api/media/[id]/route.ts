import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess } from "@/lib/errors";
import { deleteR2Objects } from "@/lib/r2";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { supabase } from "@/lib/supabase";
import { mediaUpdateSchema } from "@/lib/validators";

interface MediaRouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: MediaRouteProps) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can update media.", 403);
  }

  const { id } = await params;
  const settings = await getSiteSettings();
  const rate = await enforceRateLimit({
    request,
    session,
    policy: {
      action: "admin_update_media",
      limit: settings.admin_mutation_rate_limit_count,
      windowSeconds: settings.admin_mutation_rate_limit_window_seconds,
    },
  });

  if (!rate.allowed) {
    return apiError("RATE_LIMITED", "Too many admin changes. Please wait before trying again.", 429);
  }

  const parsed = mediaUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(
      "INVALID_INPUT",
      "Invalid media update.",
      400,
      parsed.error.flatten(),
    );
  }

  const { data: current, error: currentError } = await supabase
    .from("media")
    .select("album_id")
    .eq("id", id)
    .single();

  if (currentError || !current) {
    return apiError("NOT_FOUND", "Media not found.", 404);
  }

  const targetAlbumId = parsed.data.album_id ?? current.album_id;

  if (parsed.data.is_cover) {
    await supabase
      .from("media")
      .update({ is_cover: false })
      .eq("album_id", targetAlbumId);
  }

  const { data, error } = await supabase
    .from("media")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return apiError("SERVER_ERROR", error.message, 500);

  if (parsed.data.is_cover) {
    await supabase
      .from("albums")
      .update({
        cover_media_id: id,
        cover_url: data.thumbnail_url ?? data.poster_url ?? data.url,
      })
      .eq("id", targetAlbumId);
  }

  await logAuditEvent({
    request,
    session,
    action: "admin_update_media",
    targetType: "media",
    targetId: id,
    metadata: { changedFields: Object.keys(parsed.data) },
  });
  return apiSuccess({ media: data });
}

export async function DELETE(request: NextRequest, { params }: MediaRouteProps) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can delete media.", 403);
  }

  const { id } = await params;
  const settings = await getSiteSettings();
  const rate = await enforceRateLimit({
    request,
    session,
    policy: {
      action: "admin_delete_media",
      limit: settings.admin_mutation_rate_limit_count,
      windowSeconds: settings.admin_mutation_rate_limit_window_seconds,
    },
  });

  if (!rate.allowed) {
    return apiError("RATE_LIMITED", "Too many admin changes. Please wait before trying again.", 429);
  }

  if (settings.enable_soft_delete) {
    const { data, error } = await supabase
      .from("media")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: session.userId,
        delete_reason: "Deleted from Studio",
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return apiError("NOT_FOUND", error?.message ?? "Media not found.", 404);
    }

    await logAuditEvent({
      request,
      session,
      action: "admin_soft_delete_media",
      targetType: "media",
      targetId: id,
      metadata: {
        albumId: data.album_id,
        retentionDays: settings.soft_delete_retention_days,
      },
    });

    return apiSuccess({ deleted: true, softDeleted: true });
  }

  const { data: media, error: selectError } = await supabase
    .from("media")
    .select("r2_key,thumbnail_r2_key,medium_r2_key,poster_r2_key")
    .eq("id", id)
    .single();

  if (selectError || !media) {
    return apiError("NOT_FOUND", "Media not found.", 404);
  }

  try {
    await deleteR2Objects([
      media.r2_key,
      media.thumbnail_r2_key,
      media.medium_r2_key,
      media.poster_r2_key,
    ]);
  } catch {
    return apiError("UPLOAD_FAILED", "R2 delete failed.", 500);
  }

  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return apiError("SERVER_ERROR", error.message, 500);

  await logAuditEvent({
    request,
    session,
    action: "admin_delete_media",
    targetType: "media",
    targetId: id,
    metadata: { removedR2Objects: true },
  });
  return apiSuccess({ deleted: true });
}
