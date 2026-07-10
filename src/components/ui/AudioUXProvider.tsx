"use client";

import { useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { audioUX } from "@/lib/audio-ux";
import { useUIPreferences } from "@/hooks/useUIPreferences";

export function AudioUXProvider() {
  const { soundEnabled } = useUIPreferences();
  const pathname = usePathname();

  // Initialize context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      audioUX.init();
      audioUX.resume();
      // Remove listeners once initialized
      document.removeEventListener("pointerdown", initAudio);
      document.removeEventListener("keydown", initAudio);
    };

    document.addEventListener("pointerdown", initAudio, { once: true });
    document.addEventListener("keydown", initAudio, { once: true });

    return () => {
      document.removeEventListener("pointerdown", initAudio);
      document.removeEventListener("keydown", initAudio);
    };
  }, []);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!soundEnabled || !audioUX.isReady) return;

      // Ensure the click targets an interactive element
      let target = e.target as HTMLElement | null;
      let shouldPlayClick = false;
      let shouldPlayMenu = false;

      while (target && target !== document.body) {
        const tagName = target.tagName.toLowerCase();
        const role = target.getAttribute("role");
        const type = target.getAttribute("type");

        // Menu triggers (modals, dropdowns)
        if (target.getAttribute("aria-haspopup") || role === "menuitem") {
          shouldPlayMenu = true;
          break;
        }

        // Standard interactive elements
        if (tagName === "button" || tagName === "a" || role === "button" || type === "button") {
          shouldPlayClick = true;
          break;
        }

        target = target.parentElement;
      }

      if (shouldPlayMenu) {
        audioUX.playMenuSound();
      } else if (shouldPlayClick) {
        audioUX.playClickSound();
      }
    },
    [soundEnabled]
  );

  useEffect(() => {
    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [handleClick]);

  // Subtle sweep sound on page navigation
  useEffect(() => {
    if (soundEnabled && audioUX.isReady) {
      audioUX.playMenuSound();
    }
  }, [pathname, soundEnabled]);

  return null; // This is a utility component, no UI.
}
