import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMediaTypeFromMime } from "@/lib/config";
import { putR2Object, getPublicUrl } from "@/lib/r2";
import type { Media, SiteSettings } from "@/lib/types";
import { normalizeMedia } from "@/lib/albums";

function extensionFromMime(mimeType: string) {
  return (mimeType.split("/").at(1) ?? "bin").replace("jpeg", "jpg").replace("quicktime", "mov");
}

function fileExtension(fileName: string, mimeType: string) {
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && fromName !== fileName.toLowerCase()) return fromName.replace(/[^a-z0-9]/g, "");
  return extensionFromMime(mimeType);
}

function safeDisplayName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim().slice(0, 160) || "Untitled media";
}

function orientationFromDimensions(width?: number | null, height?: number | null) {
  if (!width || !height) return "unknown";
  if (width === height) return "square";
  return height > width ? "portrait" : "landscape";
}

async function getAlbumOwnerId(client: SupabaseClient, albumId: string) {
  const { data, error } = await client.from("albums").select("owner_id").eq("id", albumId).single();
  if (error || !data?.owner_id) throw error ?? new Error("Album not found.");
  return String(data.owner_id);
}

async function uploadVideoMedia({
  albumId,
  mediaId,
  ownerId,
  fileName,
  mimeType,
  buffer,
  settings,
}: {
  albumId: string;
  mediaId: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  settings: SiteSettings;
}) {
  if (!settings.enable_video_uploads) throw new Error("Video uploads are disabled in Studio settings.");
  const extension = extensionFromMime(mimeType);
  const uploadedAt = new Date().toISOString();
  const originalKey = `albums/${albumId}/videos/${mediaId}/original.${extension}`;
  const url = await putR2Object({
    key: originalKey,
    body: buffer,
    contentType: mimeType,
    cacheControl: "public, max-age=86400",
  });
  return {
    album_id: albumId,
    owner_id: ownerId,
    media_type: "video",
    title: safeDisplayName(fileName),
    r2_key: originalKey,
    poster_r2_key: null,
    url,
    poster_url: null,
    thumbnail_url: null,
    file_size: buffer.byteLength,
    mime_type: mimeType,
    original_filename: fileName,
    safe_display_name: safeDisplayName(fileName),
    uploaded_at: uploadedAt,
    taken_at: null,
    sort_date: uploadedAt,
    aspect_ratio: null,
    orientation: "unknown",
    file_extension: fileExtension(fileName, mimeType),
    original_file_size: buffer.byteLength,
    original_mime_type: mimeType,
    featured_rank: 0,
    view_count: 0,
    metadata_status: "unavailable",
    processing_status: "queued",
    security_status: "needs_review",
    security_notes: "Video requires the dedicated trusted video-processing worker.",
    download_allowed: true,
    original_download_allowed: false,
    metadata_stripped: false,
  };
}

export async function uploadMediaFile({
  client,
  albumId,
  fileName,
  mimeType,
  buffer,
  settings,
}: {
  client: SupabaseClient;
  albumId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  settings: SiteSettings;
}): Promise<Media> {
  const mediaType = getMediaTypeFromMime(mimeType);
  if (mediaType !== "video") throw new Error("Images must use the asynchronous processing queue.");
  const mediaId = randomUUID();
  const payload = await uploadVideoMedia({
    albumId,
    mediaId,
    ownerId: await getAlbumOwnerId(client, albumId),
    fileName,
    mimeType,
    buffer,
    settings,
  });
  const { data, error } = await client.from("media").insert({ id: mediaId, ...payload }).select("*").single();
  if (error) throw error;
  return normalizeMedia(data);
}

export async function completeUploadFile({
  client,
  albumId,
  mediaId,
  r2Key,
  fileName,
  mimeType,
  size,
  width,
  height,
  durationSeconds,
}: {
  client: SupabaseClient;
  albumId: string;
  mediaId: string;
  r2Key: string;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}): Promise<Media> {
  if (getMediaTypeFromMime(mimeType) !== "video") {
    throw new Error("Images must use the asynchronous processing queue.");
  }
  const uploadedAt = new Date().toISOString();
  const payload = {
    album_id: albumId,
    owner_id: await getAlbumOwnerId(client, albumId),
    media_type: "video",
    title: safeDisplayName(fileName),
    r2_key: r2Key,
    poster_r2_key: null,
    url: getPublicUrl(r2Key),
    poster_url: null,
    thumbnail_url: null,
    width: width ?? null,
    height: height ?? null,
    duration_seconds: durationSeconds ?? null,
    file_size: size,
    mime_type: mimeType,
    original_filename: fileName,
    safe_display_name: safeDisplayName(fileName),
    uploaded_at: uploadedAt,
    taken_at: null,
    sort_date: uploadedAt,
    aspect_ratio: width && height ? Number((width / height).toFixed(6)) : null,
    orientation: orientationFromDimensions(width, height),
    file_extension: fileExtension(fileName, mimeType),
    original_file_size: size,
    original_mime_type: mimeType,
    featured_rank: 0,
    view_count: 0,
    metadata_status: "unavailable",
    processing_status: "queued",
    security_status: "needs_review",
    security_notes: "Video requires the dedicated trusted video-processing worker.",
    download_allowed: true,
    original_download_allowed: false,
    metadata_stripped: false,
  };
  const { data, error } = await client.from("media").insert({ id: mediaId, ...payload }).select("*").single();
  if (error) throw error;
  return normalizeMedia(data);
}
