"use client";

import { useEffect, useCallback, useState } from "react";
import { audioUX } from "@/lib/audio-ux";
import { useUIPreferences } from "@/hooks/useUIPreferences";

import { AmbientSoundType, ClickSoundType } from "@/hooks/useUIPreferences";

export function AudioUXProvider({
  defaultAmbient = "drone",
  defaultClick = "water",
}: {
  defaultAmbient?: string;
  defaultClick?: string;
}) {
  const { soundEnabled, clickSound, ambientSound, ambientVolume } = useUIPreferences();
  const [isReady, setIsReady] = useState(() => Boolean(audioUX.isReady));

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
        if (target.hasAttribute("data-audio-ux-ignore")) return;
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
        audioUX.playClickSound(clickSound === "auto" ? (defaultClick as ClickSoundType) : clickSound);
      }
    },
    [soundEnabled, clickSound, defaultClick]
  );

  useEffect(() => {
    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [handleClick]);

  useEffect(() => {
    if (!soundEnabled || !isReady) {
      audioUX.stopAmbient();
      return;
    }

    let targetSound = ambientSound;

    if (targetSound === "auto") {
      targetSound = defaultAmbient as AmbientSoundType;
    }

    audioUX.setAmbientVolume(ambientVolume);
    void audioUX.playAmbient(targetSound).catch((error) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Optional ambient audio failed to start.", error);
      }
    });
    
    return () => {};
  }, [soundEnabled, ambientSound, ambientVolume, defaultAmbient, isReady]);

  return null;
}
