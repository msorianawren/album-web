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
