"use client";

import { useState } from "react";

export type DepthEffectsMode = "auto" | "full" | "reduced" | "off";

const storageKey = "ui_depth_effects";

export function useDepthEffects() {
  const [mode, setMode] = useState<DepthEffectsMode>(() => {
    if (typeof window === "undefined") return "auto";
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "full" || saved === "reduced" || saved === "off" || saved === "auto") return saved;
    } catch {
      // Storage is an optional user convenience only.
    }
    return "auto";
  });

  const updateMode = (next: DepthEffectsMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(storageKey, next);
      window.dispatchEvent(new CustomEvent("ui_depth_effects_changed"));
    } catch {
      // Keep the in-memory preference when storage is unavailable.
    }
  };

  return { mode, setMode: updateMode };
}
