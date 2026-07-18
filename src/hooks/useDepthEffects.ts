"use client";

import { useSyncExternalStore } from "react";

export type DepthEffectsMode = "auto" | "full" | "reduced" | "off";

const storageKey = "ui_depth_effects";
const changeEvent = "ui_depth_effects_changed";

function getStoredMode(): DepthEffectsMode {
  if (typeof window === "undefined") return "auto";
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "full" || saved === "reduced" || saved === "off" || saved === "auto") return saved;
  } catch {
    // Storage is an optional user convenience only.
  }
  return "auto";
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === storageKey) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, callback);
  };
}

export function useDepthEffects() {
  const mode = useSyncExternalStore<DepthEffectsMode>(subscribe, getStoredMode, () => "auto");

  const updateMode = (next: DepthEffectsMode) => {
    try {
      window.localStorage.setItem(storageKey, next);
      window.dispatchEvent(new CustomEvent(changeEvent));
    } catch {
      // The default remains usable when storage is unavailable.
    }
  };

  return { mode, setMode: updateMode };
}
