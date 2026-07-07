import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

async function countAlbumLikes(albumId: string) {
  const [{ count: directLikes, error: directError }, { data: mediaRows, error: mediaError }] =
    await Promise.all([
      supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("album_id", albumId),
      supabase.from("media").select("id").eq("album_id", albumId),
    ]);

  if (directError) throw directError;
  if (mediaError) throw mediaError;

  const mediaIds = (mediaRows ?? []).map((item) => String(item.id));
  if (!mediaIds.length) return directLikes ?? 0;

  const { count: mediaLikes, error } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .in("media_id", mediaIds);

  if (error) throw error;
  return (directLikes ?? 0) + (mediaLikes ?? 0);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return apiError("FORBIDDEN", "Only the admin can recalculate counts.", 403);

  try {
    const { data: albums, error } = await supabase.from("albums").select("id");
    if (error) return apiError("SERVER_ERROR", error.message, 500);

    let updated = 0;
    for (const album of albums ?? []) {
      const albumId = String(album.id);
      const [photoCount, videoCount, commentCount, likeCount] = await Promise.all([
        supabase
          .from("media")
          .select("id", { count: "exact", head: true })
          .eq("album_id", albumId)
          .eq("media_type", "image")
          .then(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
          }),
        supabase
          .from("media")
          .select("id", { count: "exact", head: true })
          .eq("album_id", albumId)
          .eq("media_type", "video")
          .then(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
          }),
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("album_id", albumId)
          .eq("is_hidden", false)
          .then(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
          }),
        countAlbumLikes(albumId),
      ]);

      const { error: updateError } = await supabase
        .from("albums")
        .update({
          photo_count: photoCount,
          video_count: videoCount,
          media_count: photoCount + videoCount,
          comment_count: commentCount,
          like_count: likeCount,
        })
        .eq("id", albumId);

      if (updateError) throw updateError;
      updated += 1;
    }

    return apiSuccess({ updated });
  } catch (error) {
    return toServerError(error);
  }
}
