import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAlbum } from "@/lib/albums";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { commentCreateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const albumId = request.nextUrl.searchParams.get("albumId");
  if (!albumId) return apiError("INVALID_INPUT", "albumId is required.", 400);

  const session = await requireAdmin(request);
  const album = await getAlbum(albumId, { isAdmin: Boolean(session?.isAdmin) });

  if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
  if (album.locked) return apiSuccess({ comments: [] });

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("album_id", album.id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return apiError("SERVER_ERROR", error.message, 500);
  return apiSuccess({ comments: data ?? [] });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = commentCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(
        "INVALID_INPUT",
        "Invalid comment.",
        400,
        parsed.error.flatten(),
      );
    }

    const album = await getAlbum(parsed.data.albumId);
    if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
    if (album.locked) {
      return apiError("FORBIDDEN", "Private albums do not accept public comments.", 403);
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        album_id: parsed.data.albumId,
        media_id: parsed.data.mediaId,
        author_name: parsed.data.author_name,
        body: parsed.data.body,
      })
      .select("*")
      .single();

    if (error) return apiError("SERVER_ERROR", error.message, 500);
    return apiSuccess({ comment: data }, { status: 201 });
  } catch (error) {
    return toServerError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can moderate comments.", 403);
  }

  const body = await request.json();
  const id = String(body.id ?? "");
  const isHidden = Boolean(body.is_hidden);

  if (!id) return apiError("INVALID_INPUT", "id is required.", 400);

  const { data, error } = await supabase
    .from("comments")
    .update({ is_hidden: isHidden })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return apiError("SERVER_ERROR", error.message, 500);
  return apiSuccess({ comment: data });
}
