import { ENVIRONMENT_ARTIST_CONFIG_EVENT } from "@/components/landing/NatureAnimatedBackground";

export function subscribeArtistConfig(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ENVIRONMENT_ARTIST_CONFIG_EVENT, callback);
  return () => window.removeEventListener(ENVIRONMENT_ARTIST_CONFIG_EVENT, callback);
}

export function getArtistConfigSnapshot() {
  if (typeof document === "undefined") return "mist:true";
  return `${document.documentElement.dataset.environmentArtistPreset ?? "mist"}:${document.documentElement.dataset.environmentEnabled ?? "true"}`;
}

export function getServerArtistConfigSnapshot() {
  return "mist:true";
}
