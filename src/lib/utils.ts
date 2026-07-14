import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AlbumCountDictionary = {
  albums?: {
    photo?: string;
    photos?: string;
    video?: string;
    videos?: string;
  };
};

export function formatPhotoCount(count: number, dict?: AlbumCountDictionary) {
  const label = count === 1 ? (dict?.albums?.photo || "photo") : (dict?.albums?.photos || "photos");
  return `${new Intl.NumberFormat("en").format(count)} ${label}`;
}

export function formatMediaCount(photoCount: number, videoCount: number, dict?: AlbumCountDictionary) {
  const photoLabel = photoCount === 1 ? (dict?.albums?.photo || "photo") : (dict?.albums?.photos || "photos");
  const videoLabel = videoCount === 1 ? (dict?.albums?.video || "video") : (dict?.albums?.videos || "videos");
  
  const photos = `${new Intl.NumberFormat("en").format(photoCount)} ${photoLabel}`;
  const videos = `${new Intl.NumberFormat("en").format(videoCount)} ${videoLabel}`;

  return `${photos} - ${videos}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
