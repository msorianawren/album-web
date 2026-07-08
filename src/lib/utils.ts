import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhotoCount(count: number) {
  return `${new Intl.NumberFormat("en").format(count)} ${
    count === 1 ? "photo" : "photos"
  }`;
}

export function formatMediaCount(photoCount: number, videoCount: number) {
  const photos = `${new Intl.NumberFormat("en").format(photoCount)} ${
    photoCount === 1 ? "photo" : "photos"
  }`;
  const videos = `${new Intl.NumberFormat("en").format(videoCount)} ${
    videoCount === 1 ? "video" : "videos"
  }`;

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
