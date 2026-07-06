import { NextRequest } from "next/server";
import { getAlbum } from "@/lib/albums";
import { getPublicSession } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { likeCreateSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await getPublicSession(request);
    const parsed = likeCreateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return apiError(
        "INVALID_INPUT",
        "Invalid like payload.",
        400,
        parsed.error.flatten(),
      );
    }

    if (parsed.data.albumId) {
      const album = await getAlbum(parsed.data.albumId);
      if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
      if (album.locked) return apiError("FORBIDDEN", "Private album.", 403);
    }

    const clientId =
      parsed.data.clientId ??
      request.cookies.get("album_client_id")?.value ??
      session.userId ??
      "anonymous";

    const { error } = await supabase.from("likes").upsert(
      {
        album_id: parsed.data.albumId,
        media_id: parsed.data.mediaId,
        client_id: clientId,
        user_id: session.userId,
      },
      {
        onConflict: parsed.data.mediaId
          ? "client_id,media_id"
          : "client_id,album_id",
        ignoreDuplicates: true,
      },
    );

    if (error) return apiError("SERVER_ERROR", error.message, 500);

    const countQuery = supabase
      .from("likes")
      .select("id", { count: "exact", head: true });

    const { count } = parsed.data.mediaId
      ? await countQuery.eq("media_id", parsed.data.mediaId)
      : await countQuery.eq("album_id", parsed.data.albumId);

    return apiSuccess({ count: count ?? 0 });
  } catch (error) {
    return toServerError(error);
  }
}
