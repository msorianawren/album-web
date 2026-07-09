import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSiteSettings } from "@/lib/site-settings";
import { supabase } from "@/lib/supabase";
import { getPresignedPutUrl, getPublicUrl } from "@/lib/r2";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

function extensionFromMime(mimeType: string) {
  const fallback = mimeType.split("/").at(1) ?? "bin";
  return fallback.replace("jpeg", "jpg").replace("quicktime", "mov");
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can upload media.", 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { albumId, filename, size, mimeType, mediaType } = body;

    if (!albumId || !filename || !size || !mimeType || !mediaType) {
      return apiError("INVALID_INPUT", "albumId, filename, size, mimeType, and mediaType are required.", 400);
    }

    // Verify album exists
    const { data: album, error: albumError } = await supabase
      .from("albums")
      .select("id")
      .eq("id", albumId)
      .single();

    if (albumError || !album) {
      return apiError("NOT_FOUND", "Album not found.", 404);
    }

    const settings = await getSiteSettings();

    // Verify media type settings
    if (mediaType === "image" && !settings.enable_image_uploads) {
      return apiError("UNSUPPORTED_MEDIA_TYPE", "Image uploads are disabled in Studio settings.", 400);
    }
    if (mediaType === "video" && !settings.enable_video_uploads) {
      return apiError("UNSUPPORTED_MEDIA_TYPE", "Video uploads are disabled in Studio settings.", 400);
    }

    // Verify size limits
    const maxSizeBytes = mediaType === "image"
      ? settings.max_image_size_mb * 1024 * 1024
      : settings.max_video_size_mb * 1024 * 1024;

    if (size > maxSizeBytes) {
      return apiError(
        "PAYLOAD_TOO_LARGE",
        `${filename} exceeds the maximum upload limit of ${mediaType === "image" ? settings.max_image_size_mb : settings.max_video_size_mb} MB.`,
        413
      );
    }

    // Verify total album storage limits
    const { data: existingMedia } = await supabase
      .from("media")
      .select("file_size")
      .eq("album_id", albumId);

    const currentAlbumBytes = (existingMedia ?? []).reduce(
      (sum, item) => sum + Number(item.file_size ?? 0),
      0,
    );

    if (currentAlbumBytes + size > settings.max_album_storage_mb * 1024 * 1024) {
      return apiError("PAYLOAD_TOO_LARGE", "This upload would exceed the album storage limit.", 413);
    }

    const mediaId = randomUUID();
    const ext = extensionFromMime(mimeType);
    const folder = mediaType === "image" ? "images" : "videos";
    const r2Key = `albums/${albumId}/${folder}/${mediaId}/original.${ext}`;

    const uploadUrl = await getPresignedPutUrl({
      key: r2Key,
      contentType: mimeType,
      expiresIn: 300,
    });

    const publicUrl = getPublicUrl(r2Key);

    return apiSuccess({
      mediaId,
      uploadUrl,
      r2Key,
      publicUrl,
      expiresIn: 300,
    });
  } catch (error) {
    return toServerError(error);
  }
}
