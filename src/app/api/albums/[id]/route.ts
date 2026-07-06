import { NextRequest } from "next/server";
import { getAlbum } from "@/lib/albums";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { deleteR2Objects } from "@/lib/r2";
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
    const parsed = albumUpdateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return apiError(
        "INVALID_INPUT",
        "Invalid album update.",
        400,
        parsed.error.flatten(),
      );
    }

    const { data, error } = await supabase
      .from("albums")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return apiError("SERVER_ERROR", error.message, 500);
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
  const { data: mediaRows, error: mediaError } = await supabase
    .from("media")
    .select("r2_key,thumbnail_r2_key,poster_r2_key")
    .eq("album_id", id);

  if (mediaError) return apiError("SERVER_ERROR", mediaError.message, 500);

  const { error } = await supabase.from("albums").delete().eq("id", id);
  if (error) return apiError("SERVER_ERROR", error.message, 500);

  try {
    await deleteR2Objects(
      (mediaRows ?? []).flatMap((item) => [
        item.r2_key,
        item.thumbnail_r2_key,
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

  return apiSuccess({ deleted: true });
}
