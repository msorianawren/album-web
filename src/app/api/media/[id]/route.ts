import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/errors";
import { deleteR2Objects } from "@/lib/r2";
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

  if (parsed.data.is_cover) {
    await supabase
      .from("media")
      .update({ is_cover: false })
      .eq("album_id", current.album_id);
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
      .eq("id", data.album_id);
  }

  return apiSuccess({ media: data });
}

export async function DELETE(request: NextRequest, { params }: MediaRouteProps) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can delete media.", 403);
  }

  const { id } = await params;
  const { data: media, error: selectError } = await supabase
    .from("media")
    .select("r2_key,thumbnail_r2_key,poster_r2_key")
    .eq("id", id)
    .single();

  if (selectError || !media) {
    return apiError("NOT_FOUND", "Media not found.", 404);
  }

  try {
    await deleteR2Objects([
      media.r2_key,
      media.thumbnail_r2_key,
      media.poster_r2_key,
    ]);
  } catch {
    return apiError("UPLOAD_FAILED", "R2 delete failed.", 500);
  }

  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return apiError("SERVER_ERROR", error.message, 500);

  return apiSuccess({ deleted: true });
}
