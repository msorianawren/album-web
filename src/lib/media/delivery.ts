import type { AlbumStatus, MediaType } from "@/lib/types";

export type MediaDeliveryVariant =
  | "thumbnail"
  | "medium"
  | "display"
  | "poster"
  | "original"
  | "safe-preview"
  | "placeholder";

export type MediaAuthorizationState =
  | "public"
  | "authorized-private"
  | "safe-preview-only"
  | "denied";

export type MediaProcessingState = "ready" | "pending" | "failed" | "rejected";

export interface MediaDeliveryCandidate {
  src: string;
  variant: MediaDeliveryVariant;
  expectedContentType: "image" | "video";
  bypassOptimization: boolean;
}

export interface MediaDeliveryTarget {
  src: string | null;
  candidates: MediaDeliveryCandidate[];
}

export interface MediaDeliveryDescriptor {
  publicCard: MediaDeliveryTarget;
  authorizedPrivateCard: MediaDeliveryTarget;
  card: MediaDeliveryTarget;
  viewer: MediaDeliveryTarget;
  download: MediaDeliveryTarget;
  originalDownload: MediaDeliveryTarget;
  safePreview: MediaDeliveryTarget;
  placeholder: MediaDeliveryTarget;
  downloadHref: string | null;
  authorizationState: MediaAuthorizationState;
  processingState: MediaProcessingState;
  mediaType: MediaType;
  alt: string;
  width: number;
  height: number;
  aspectRatio: number;
  mimeType: string | null;
}

export interface DeliveryMedia {
  id: string;
  media_type: MediaType;
  title?: string | null;
  original_filename?: string | null;
  url?: string | null;
  thumbnail_url?: string | null;
  medium_url?: string | null;
  poster_url?: string | null;
  width?: number | null;
  height?: number | null;
  aspect_ratio?: number | null;
  mime_type?: string | null;
  processing_status?: DeliveryProcessingStatus | null;
  security_status?: "processed" | "needs_review" | "rejected" | null;
  download_allowed?: boolean;
  original_download_allowed?: boolean;
}

export type DeliveryProcessingStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "ready"
  | "failed"
  | "quarantined"
  | "deleting"
  | "deleted"
  | "processed"
  | "pending";

export interface MediaDeliveryContext {
  albumStatus?: AlbumStatus;
  isAuthorized?: boolean;
  safePreviewUrl?: string | null;
  downloadAllowed?: boolean;
  originalDownloadAllowed?: boolean;
}

const PLACEHOLDER_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900'%3E%3Crect width='1200' height='900' fill='%23eadfce'/%3E%3Cpath d='M210 600 430 390l145 145 105-95 310 270H210Z' fill='%23d8cbb9'/%3E%3Ccircle cx='790' cy='300' r='82' fill='%23f4ecdf'/%3E%3C/svg%3E";

const LOCAL_ORIGIN = "https://media.local";

export function normalizeMediaDeliveryUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;

  if (trimmed.startsWith("data:image/") || trimmed.startsWith("blob:")) return trimmed;
  if (trimmed.startsWith("//")) return null;

  try {
    const parsed = new URL(trimmed, LOCAL_ORIGIN);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.origin === LOCAL_ORIGIN) {
      if (!trimmed.startsWith("/")) return null;
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export function shouldBypassNextImageOptimization(src: string | null | undefined) {
  const value = normalizeMediaDeliveryUrl(src);
  if (!value) return false;
  if (value.startsWith("data:") || value.startsWith("blob:")) return true;
  if (value.startsWith("/api/media/") || value.startsWith("/api/albums/")) return true;

  try {
    const parsed = new URL(value);
    const signedQuery = [...parsed.searchParams.keys()].some((key) =>
      /^(x-amz-|signature$|token$|expires$|policy$)/i.test(key),
    );
    return (
      signedQuery ||
      parsed.hostname.endsWith(".r2.dev") ||
      parsed.hostname.endsWith(".r2.cloudflarestorage.com") ||
      parsed.hostname.endsWith(".supabase.co") ||
      parsed.hostname !== "images.unsplash.com"
    );
  } catch {
    return true;
  }
}

export function isExpectedMediaContentType(
  contentType: string | null | undefined,
  expected: "image" | "video",
) {
  const normalized = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  return Boolean(normalized?.startsWith(`${expected}/`));
}

function candidate(
  src: string | null | undefined,
  variant: MediaDeliveryVariant,
  expectedContentType: "image" | "video",
): MediaDeliveryCandidate | null {
  const normalized = normalizeMediaDeliveryUrl(src);
  if (!normalized) return null;
  return {
    src: normalized,
    variant,
    expectedContentType,
    bypassOptimization: shouldBypassNextImageOptimization(normalized),
  };
}

function target(...values: Array<MediaDeliveryCandidate | null>): MediaDeliveryTarget {
  const seen = new Set<string>();
  const candidates = values.filter((value): value is MediaDeliveryCandidate => {
    if (!value || seen.has(value.src)) return false;
    seen.add(value.src);
    return true;
  });
  return { src: candidates[0]?.src ?? null, candidates };
}

export function createMediaDeliveryTarget(
  src: string | null | undefined,
  variant: MediaDeliveryVariant = "display",
  expectedContentType: "image" | "video" = "image",
) {
  return target(candidate(src, variant, expectedContentType));
}

function processingState(media: DeliveryMedia): MediaProcessingState {
  if (media.security_status === "rejected") return "rejected";
  if (["failed", "quarantined", "deleting", "deleted"].includes(media.processing_status ?? "")) {
    return "failed";
  }
  if (["uploaded", "queued", "processing", "pending"].includes(media.processing_status ?? "")) {
    return "pending";
  }
  return media.processing_status === "ready" || media.processing_status === "processed" || !media.processing_status
    ? "ready"
    : "failed";
}

export function isMediaReadyForDelivery(media: DeliveryMedia) {
  return processingState(media) === "ready";
}

function safeDimensions(media: DeliveryMedia) {
  const width = Number(media.width);
  const height = Number(media.height);
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return { width, height, aspectRatio: width / height };
  }
  const aspectRatio = Number(media.aspect_ratio);
  if (Number.isFinite(aspectRatio) && aspectRatio > 0) {
    return { width: Math.round(1200 * aspectRatio), height: 1200, aspectRatio };
  }
  return { width: 1200, height: 900, aspectRatio: 4 / 3 };
}

export function getMediaDeliveryDescriptor(
  media: DeliveryMedia,
  context: MediaDeliveryContext = {},
): MediaDeliveryDescriptor {
  const mediaType = media.media_type;
  const expected = mediaType === "video" ? "video" : "image";
  const poster = candidate(media.poster_url, "poster", "image");
  const thumbnail = candidate(media.thumbnail_url, "thumbnail", "image");
  const medium = candidate(media.medium_url, "medium", "image");
  const display = candidate(media.url, "display", expected);
  const original = candidate(media.url, "original", expected);
  const placeholder = target(candidate(PLACEHOLDER_SRC, "placeholder", "image"));
  const safePreview = target(candidate(context.safePreviewUrl, "safe-preview", "image"));
  const state = processingState(media);
  const isPrivate = context.albumStatus === "private";
  const isAuthorized = context.isAuthorized !== false;
  const isReady = state === "ready";

  const publicCard = !isPrivate && isReady
    ? target(thumbnail, poster, medium, display)
    : target();
  const authorizedPrivateCard = isPrivate && isAuthorized && isReady
    ? target(thumbnail, poster, medium, display)
    : target();
  const selectedCard = isPrivate
    ? isAuthorized
      ? authorizedPrivateCard
      : safePreview
    : publicCard;
  const viewer = isReady && (!isPrivate || isAuthorized)
    ? mediaType === "video"
      ? target(display)
      : target(medium, display, thumbnail)
    : target();
  const downloadAllowed = context.downloadAllowed ?? media.download_allowed !== false;
  const originalDownloadAllowed =
    context.originalDownloadAllowed ?? media.original_download_allowed === true;
  const download = isReady && isAuthorized && downloadAllowed
    ? mediaType === "video"
      ? target(display)
      : target(medium, thumbnail, display)
    : target();
  const originalDownload = isReady && isAuthorized && downloadAllowed && originalDownloadAllowed
    ? target(original)
    : target();
  const authorizationState: MediaAuthorizationState = !isPrivate
    ? "public"
    : isAuthorized
      ? "authorized-private"
      : safePreview.src
        ? "safe-preview-only"
        : "denied";
  const dimensions = safeDimensions(media);
  const alt =
    media.original_filename?.trim() ||
    media.title?.trim() ||
    (mediaType === "video" ? "Album video" : "Album image");

  return {
    publicCard,
    authorizedPrivateCard,
    card: selectedCard.src ? selectedCard : placeholder,
    viewer: viewer.src ? viewer : placeholder,
    download,
    originalDownload,
    safePreview,
    placeholder,
    downloadHref:
      isReady && isAuthorized && downloadAllowed
        ? `/api/media/${encodeURIComponent(media.id)}/download`
        : null,
    authorizationState,
    processingState: state,
    mediaType,
    alt,
    ...dimensions,
    mimeType: media.mime_type?.trim() || null,
  };
}
