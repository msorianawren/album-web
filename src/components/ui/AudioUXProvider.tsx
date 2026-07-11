"use client";

import { useEffect, useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { audioUX } from "@/lib/audio-ux";
import { useUIPreferences } from "@/hooks/useUIPreferences";

export function AudioUXProvider() {
  const { soundEnabled, clickSound, ambientSound, bgThemeOverride } = useUIPreferences();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initAudio = () => {
      audioUX.init();
      audioUX.resume();
      setIsReady(true);
      document.removeEventListener("pointerdown", initAudio);
      document.removeEventListener("keydown", initAudio);
    };

    document.addEventListener("pointerdown", initAudio, { once: true });
    document.addEventListener("keydown", initAudio, { once: true });

    // Also check if it's already ready (e.g. fast refresh)
    if (audioUX.isReady) {
      setIsReady(true);
    }

    return () => {
      document.removeEventListener("pointerdown", initAudio);
      document.removeEventListener("keydown", initAudio);
    };
  }, []);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!soundEnabled || !audioUX.isReady) return;

      let target = e.target as HTMLElement | null;
      let shouldPlayClick = false;
      let shouldPlayMenu = false;

      while (target && target !== document.body) {
        const tagName = target.tagName.toLowerCase();
        const role = target.getAttribute("role");
        const type = target.getAttribute("type");

        if (target.getAttribute("aria-haspopup") || role === "menuitem") {
          shouldPlayMenu = true;
          break;
        }

        if (tagName === "button" || tagName === "a" || role === "button" || type === "button") {
          shouldPlayClick = true;
          break;
        }

        target = target.parentElement;
      }

      if (shouldPlayMenu) {
        audioUX.playMenuSound();
      } else if (shouldPlayClick) {
        audioUX.playClickSound(clickSound);
      }
    },
    [soundEnabled, clickSound]
  );

  useEffect(() => {
    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [handleClick]);

  // Handle ambient sound playback based on 'auto' mapped to Theme, or explicit manual choice
  useEffect(() => {
    if (!soundEnabled || !isReady) {
      audioUX.stopAmbient();
      return;
    }

    let targetSound = ambientSound;

    // 1-to-1 Mapping logic
    if (targetSound === "auto") {
      const themeMap: Record<string, any> = {
        sakura: "harp",
        fireflies: "piano",
        snow: "rain",
        autumn: "pad",
        mist: "drone",
        rain: "cave"
      };
      targetSound = themeMap[bgThemeOverride] || "silence";
    }

    audioUX.playAmbient(targetSound);
    
    return () => {
      // audioUX.stopAmbient(); // We don't want to stop it on unmount unless it changes
    };
  }, [soundEnabled, ambientSound, bgThemeOverride, pathname, isReady]);

  return null;
}
