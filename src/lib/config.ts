import type { AlbumStatus, MediaType } from "@/lib/types";

export const albumStatuses = ["public", "updating", "private"] as const;
export const mediaTypes = ["image", "video"] as const;

export const imageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const videoMimeTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const uploadLimits = {
  image: 30 * 1024 * 1024,
  video: 500 * 1024 * 1024,
} satisfies Record<MediaType, number>;

export const commentLimits = {
  authorName: 80,
  body: 1000,
};

export const albumLimits = {
  title: 120,
  description: 500,
};

export const privateAlbumMessage =
  "This album is private. Please contact the owner for access.";

export function isAlbumStatus(value: unknown): value is AlbumStatus {
  return typeof value === "string" && albumStatuses.includes(value as AlbumStatus);
}

export function getMediaTypeFromMime(mimeType: string): MediaType | null {
  if (imageMimeTypes.includes(mimeType as (typeof imageMimeTypes)[number])) {
    return "image";
  }

  if (videoMimeTypes.includes(mimeType as (typeof videoMimeTypes)[number])) {
    return "video";
  }

  return null;
}

export function getUploadLimit(mediaType: MediaType) {
  return uploadLimits[mediaType];
}
