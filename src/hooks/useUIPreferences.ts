"use client";

import { useEffect, useState } from "react";

interface UIPreferences {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export function useUIPreferences(): UIPreferences {
  const [soundEnabled, setSoundEnabledState] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui_sound_enabled");
      if (stored !== null) {
        setSoundEnabledState(stored === "true");
      }
    } catch (e) {}
  }, []);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem("ui_sound_enabled", enabled.toString());
      // Dispatch custom event to notify other components (e.g. AudioUXProvider)
      window.dispatchEvent(new CustomEvent("ui_preferences_changed"));
    } catch (e) {}
  };

  // We can also listen to changes from other tabs/instances
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ui_sound_enabled") {
        setSoundEnabledState(e.newValue === "true");
      }
    };
    const handleCustom = () => {
      const stored = localStorage.getItem("ui_sound_enabled");
      if (stored !== null) setSoundEnabledState(stored === "true");
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("ui_preferences_changed", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("ui_preferences_changed", handleCustom);
    };
  }, []);

  return { soundEnabled, setSoundEnabled };
}
