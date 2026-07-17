import { NextRequest } from "next/server";
import { getAlbum } from "@/lib/albums";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { createPublicServerClient } from "@/lib/db/public";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { supabase } from "@/lib/supabase";
import { likeCreateSchema } from "@/lib/validators";

function likeTargetQuery(client: SupabaseClient, albumId?: string | null, mediaId?: string | null) {
  const query = client.from("likes").select("*");
  return mediaId ? query.eq("media_id", mediaId) : query.eq("album_id", albumId);
}

async function getLikeCount(client: SupabaseClient, albumId?: string | null, mediaId?: string | null) {
  const query = client.from("likes").select("id", { count: "exact", head: true });
  const { count } = mediaId
    ? await query.eq("media_id", mediaId)
    : await query.eq("album_id", albumId);
  return count ?? 0;
}

async function resolveLikeAlbumId(
  client: SupabaseClient,
  albumId?: string | null,
  mediaId?: string | null,
) {
  if (!mediaId) return albumId ?? null;
  const { data, error } = await client
    .from("media")
    .select("album_id")
    .eq("id", mediaId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data?.album_id) return null;
  if (albumId && albumId !== data.album_id) return null;
  return String(data.album_id);
}

export async function GET(request: NextRequest) {
  const session = await getPublicSession(request);
  const userClient = session.userId ? await createAuthenticatedUserClient(request) : null;
  const readClient = userClient ?? createPublicServerClient();
  const albumId = request.nextUrl.searchParams.get("albumId");
  const mediaId = request.nextUrl.searchParams.get("mediaId");
  const clientId =
    request.nextUrl.searchParams.get("clientId") ??
    request.cookies.get("album_client_id")?.value ??
    session.userId;

  if (!albumId && !mediaId) {
    return apiError("INVALID_INPUT", "albumId or mediaId is required.", 400);
  }

  const targetAlbumId = await resolveLikeAlbumId(readClient, albumId, mediaId);
  if (!targetAlbumId) return apiError("NOT_FOUND", "Like target not found.", 404);
  const album = await getAlbum(targetAlbumId, { isAdmin: session.isAdmin, userClient });
  if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
  if (album.locked) return apiError("FORBIDDEN", "Private album.", 403);

  const count = await getLikeCount(readClient, targetAlbumId, mediaId);
  let liked = false;

  if (clientId || session.userId) {
    let query = likeTargetQuery(readClient, targetAlbumId, mediaId).limit(1);
    query = session.userId
      ? query.or(`user_id.eq.${session.userId},client_id.eq.${clientId ?? session.userId}`)
      : query.eq("client_id", clientId);
    const { data } = await query;
    liked = Boolean(data?.length);
  }

  return apiSuccess({ count, liked });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getPublicSession(request);
    const userClient = session.userId ? await createAuthenticatedUserClient(request) : null;
    const readClient = userClient ?? createPublicServerClient();
    const settings = await getSiteSettings();
    if (!settings.enable_likes || !settings.allow_public_likes) {
      return apiError("FORBIDDEN", "Likes are currently disabled.", 403);
    }

    const rate = await enforceRateLimit({
      request,
      session,
      policy: {
        action: "toggle_like",
        limit: settings.like_rate_limit_count,
        windowSeconds: settings.like_rate_limit_window_seconds,
      },
    });

    if (!rate.allowed) {
      return apiError("RATE_LIMITED", "Too many like actions. Please wait before trying again.", 429);
    }

    const parsed = likeCreateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return apiError(
        "INVALID_INPUT",
        "Invalid like payload.",
        400,
        parsed.error.flatten(),
      );
    }

    const targetAlbumId = await resolveLikeAlbumId(readClient, parsed.data.albumId, parsed.data.mediaId);
    if (!targetAlbumId) return apiError("NOT_FOUND", "Like target not found.", 404);
    const album = await getAlbum(targetAlbumId, { isAdmin: session.isAdmin, userClient });
    if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
    if (album.locked) return apiError("FORBIDDEN", "Private album.", 403);

    const clientId =
      parsed.data.clientId ??
      request.cookies.get("album_client_id")?.value ??
      session.userId ??
      "anonymous";

    let existingQuery = likeTargetQuery(readClient, targetAlbumId, parsed.data.mediaId).limit(1);
    existingQuery = session.userId
      ? existingQuery.or(`user_id.eq.${session.userId},client_id.eq.${clientId}`)
      : existingQuery.eq("client_id", clientId);
    const { data: existing, error: existingError } = await existingQuery;

    if (existingError) return apiError("SERVER_ERROR", existingError.message, 500);

    let liked = true;

    if (existing?.[0]) {
      const { error } = await supabase.from("likes").delete().eq("id", existing[0].id);
      if (error) return apiError("SERVER_ERROR", error.message, 500);
      liked = false;
    } else {
      const { error } = await supabase.from("likes").insert({
        album_id: targetAlbumId,
        media_id: parsed.data.mediaId,
        client_id: clientId,
        user_id: session.userId,
      });
      if (error) return apiError("SERVER_ERROR", error.message, 500);
    }

    const count = await getLikeCount(readClient, targetAlbumId, parsed.data.mediaId);
    return apiSuccess({ count, liked });
  } catch (error) {
    return toServerError(error);
  }
}
