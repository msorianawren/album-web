import type { AlbumPreviewItem, Media } from "@/lib/types";

type DisplayMedia = Pick<
  Media,
  | "id"
  | "media_type"
  | "title"
  | "original_filename"
  | "url"
  | "thumbnail_url"
  | "medium_url"
  | "poster_url"
>;

type DisplayContext = {
  isAuthorized?: boolean;
  isSafePreview?: boolean;
};

const PLACEHOLDER_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900'%3E%3Crect width='1200' height='900' fill='%23eadfce'/%3E%3Cpath d='M210 600 430 390l145 145 105-95 310 270H210Z' fill='%23d8cbb9'/%3E%3Ccircle cx='790' cy='300' r='82' fill='%23f4ecdf'/%3E%3C/svg%3E";

function usableUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
}

export function shouldBypassNextImageOptimization(src: string | null | undefined) {
  const value = usableUrl(src);
  if (!value) return false;
  if (value.startsWith("data:") || value.startsWith("blob:")) return true;

  try {
    const hostname = new URL(value).hostname;
    return (
      hostname.endsWith(".r2.dev") ||
      hostname.endsWith(".r2.cloudflarestorage.com") ||
      hostname.includes("supabase.co")
    );
  } catch {
    return false;
  }
}

export function getMediaDisplayUrls(
  media: DisplayMedia | AlbumPreviewItem,
  context: DisplayContext = {},
) {
  const isAuthorized = context.isAuthorized !== false;
  const alt =
    usableUrl("original_filename" in media ? media.original_filename : null) ??
    usableUrl(media.title) ??
    (media.media_type === "video" ? "Album video" : "Album image");

  const safePreview = usableUrl(media.thumbnail_url) ?? usableUrl(media.poster_url);

  if (!isAuthorized) {
    return {
      cardSrc: safePreview ?? PLACEHOLDER_SRC,
      viewerSrc: PLACEHOLDER_SRC,
      downloadSrc: null,
      placeholderSrc: PLACEHOLDER_SRC,
      alt,
      isAuthorized: false,
      isSafePreview: Boolean(safePreview),
    };
  }

  const cardSrc =
    usableUrl(media.thumbnail_url) ??
    usableUrl(media.poster_url) ??
    usableUrl(media.medium_url) ??
    usableUrl(media.url) ??
    PLACEHOLDER_SRC;

  const viewerSrc =
    media.media_type === "video"
      ? usableUrl(media.url) ?? cardSrc
      : usableUrl(media.medium_url) ?? usableUrl(media.url) ?? cardSrc;

  return {
    cardSrc,
    viewerSrc,
    downloadSrc: usableUrl(media.url),
    placeholderSrc: PLACEHOLDER_SRC,
    alt,
    isAuthorized: true,
    isSafePreview: Boolean(context.isSafePreview || safePreview),
  };
}
