import type { MetaFeedItemType, NormalizedMetaFeedItem } from "@/lib/meta/types";

const text = (value: unknown, max = 2_000) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const positiveInt = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : null;

function publicUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["www.facebook.com", "facebook.com", "m.facebook.com"].includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
}

function thumbnailUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try { return new URL(value).protocol === "https:" ? value : null; } catch { return null; }
}

function typeOf(raw: Record<string, unknown>): MetaFeedItemType {
  if (raw.is_live_streaming === false || raw.live_status === "VOD") return "live_replay";
  if (String(raw.media_type ?? "").toUpperCase().includes("REEL") || String(raw.type ?? "").toLowerCase().includes("reel")) return "reel";
  return raw.post_id || raw.from ? "video_post" : "video";
}

function safeMetadata(raw: Record<string, unknown>) {
  return {
    id: text(raw.id, 200),
    created_time: text(raw.created_time, 100),
    media_type: text(raw.media_type, 80),
    live_status: text(raw.live_status, 80),
  };
}

export function normalizeMetaVideo(raw: Record<string, unknown>, pageId: string): NormalizedMetaFeedItem | null {
  if (raw.type === "status" || raw.type === "photo" || raw.media_type === "PHOTO") return null;
  const id = text(raw.id, 200);
  const attachment = Array.isArray(raw.attachments) ? raw.attachments[0] as Record<string, unknown> | undefined : undefined;
  const attachmentMedia = attachment && typeof attachment.media === "object" && attachment.media !== null ? attachment.media as Record<string, unknown> : undefined;
  const attachmentImage = attachmentMedia && typeof attachmentMedia.image === "object" && attachmentMedia.image !== null ? attachmentMedia.image as Record<string, unknown> : undefined;
  const videoId = text(raw.video_id, 200) ?? id;
  const permalink = publicUrl(raw.permalink_url) ?? publicUrl(attachment?.url) ?? (videoId ? `https://www.facebook.com/${pageId}/videos/${videoId}/` : null);
  if (!id || !videoId || !permalink) return null;
  const format = Array.isArray(raw.format) ? raw.format.find((item) => typeof item === "object" && item !== null) as Record<string, unknown> | undefined : undefined;
  const width = positiveInt(raw.width) ?? positiveInt(format?.width);
  const height = positiveInt(raw.height) ?? positiveInt(format?.height);
  return {
    providerItemId: id,
    postId: text(raw.post_id, 200),
    videoId,
    itemType: typeOf(raw),
    message: text(raw.description) ?? text(raw.message),
    title: text(raw.title),
    permalinkUrl: permalink,
    embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(permalink)}&show_text=false`,
    thumbnailUrl: thumbnailUrl(raw.picture) ?? thumbnailUrl(raw.thumbnail_url) ?? thumbnailUrl(attachmentImage?.src),
    width,
    height,
    durationSeconds: positiveInt(raw.length) ?? positiveInt(raw.duration),
    publishedAt: text(raw.created_time, 100),
    isPublic: raw.privacy === undefined || raw.privacy === "EVERYONE" || raw.is_public === true,
    rawMetadata: safeMetadata(raw),
  };
}

export function aspectRatio(item: Pick<NormalizedMetaFeedItem, "width" | "height">) {
  if (!item.width || !item.height) return 16 / 9;
  const ratio = item.width / item.height;
  return ratio > 0.35 && ratio < 3 ? ratio : 16 / 9;
}
