"use client";

import { useEffect, useState } from "react";

export type ClickSoundType = "auto" | "water" | "crystal" | "wood" | "chime" | "thud";
export type BgThemeType = "default" | "sakura" | "fireflies" | "snow" | "autumn" | "mist" | "rain";
export type AmbientSoundType = "auto" | "harp" | "piano" | "silence" | "pad" | "drone" | "rain" | "cave" | "sweden" | "wethands" | "miceonvenus";

interface UIPreferences {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  clickSound: ClickSoundType;
  setClickSound: (sound: ClickSoundType) => void;
  ambientSound: AmbientSoundType;
  setAmbientSound: (sound: AmbientSoundType) => void;
  ambientVolume: number;
  setAmbientVolume: (val: number) => void;
  bgThemeOverride: BgThemeType;
  setBgThemeOverride: (theme: BgThemeType) => void;
  bgCustomUrlOverride: boolean;
  setBgCustomUrlOverride: (hasCustom: boolean) => void;
}

function reportPreferenceStorageIssue(action: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`UI preference storage ${action} failed.`, error);
  }
}

export function useUIPreferences(): UIPreferences {
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [clickSound, setClickSoundState] = useState<ClickSoundType>("auto");
  const [ambientSound, setAmbientSoundState] = useState<AmbientSoundType>("auto");
  const [ambientVolume, setAmbientVolumeState] = useState<number>(0.5);
  const [bgThemeOverride, setBgThemeOverrideState] = useState<BgThemeType>("default");
  const [bgCustomUrlOverride, setBgCustomUrlOverrideState] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedSound = localStorage.getItem("ui_sound_enabled");
        if (storedSound !== null) setSoundEnabledState(storedSound === "true");

        const storedClick = localStorage.getItem("ui_click_sound");
        if (storedClick) setClickSoundState(storedClick as ClickSoundType);

        const storedAmbient = localStorage.getItem("ui_ambient_sound");
        if (storedAmbient) setAmbientSoundState(storedAmbient as AmbientSoundType);

        const storedVolume = localStorage.getItem("ui_ambient_volume");
        if (storedVolume) setAmbientVolumeState(parseFloat(storedVolume));

        const storedTheme = localStorage.getItem("ui_bg_theme");
        if (storedTheme) setBgThemeOverrideState(storedTheme as BgThemeType);

        const storedCustomUrl = localStorage.getItem("ui_has_custom_bg");
        if (storedCustomUrl) setBgCustomUrlOverrideState(storedCustomUrl === "true");
      } catch (error) {
        reportPreferenceStorageIssue("read", error);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const dispatchCustomEvent = () => window.dispatchEvent(new CustomEvent("ui_preferences_changed"));

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem("ui_sound_enabled", enabled.toString());
      dispatchCustomEvent();
    } catch (error) {
      reportPreferenceStorageIssue("write sound setting", error);
    }
  };

  const setClickSound = (sound: ClickSoundType) => {
    setClickSoundState(sound);
    try {
      localStorage.setItem("ui_click_sound", sound);
      dispatchCustomEvent();
    } catch (error) {
      reportPreferenceStorageIssue("write click sound", error);
    }
  };

  const setAmbientSound = (sound: AmbientSoundType) => {
    setAmbientSoundState(sound);
    try {
      localStorage.setItem("ui_ambient_sound", sound);
      dispatchCustomEvent();
    } catch (error) {
      reportPreferenceStorageIssue("write ambient sound", error);
    }
  };

  const setAmbientVolume = (val: number) => {
    setAmbientVolumeState(val);
    try {
      localStorage.setItem("ui_ambient_volume", val.toString());
      dispatchCustomEvent();
    } catch (error) {
      reportPreferenceStorageIssue("write ambient volume", error);
    }
  };

  const setBgThemeOverride = (theme: BgThemeType) => {
    setBgThemeOverrideState(theme);
    try {
      localStorage.setItem("ui_bg_theme", theme);
      dispatchCustomEvent();
    } catch (error) {
      reportPreferenceStorageIssue("write background theme", error);
    }
  };

  const setBgCustomUrlOverride = (hasCustom: boolean) => {
    setBgCustomUrlOverrideState(hasCustom);
    try {
      localStorage.setItem("ui_has_custom_bg", hasCustom.toString());
      dispatchCustomEvent();
    } catch (error) {
      reportPreferenceStorageIssue("write custom background flag", error);
    }
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ui_sound_enabled") setSoundEnabledState(e.newValue === "true");
      if (e.key === "ui_click_sound" && e.newValue) setClickSoundState(e.newValue as ClickSoundType);
      if (e.key === "ui_ambient_sound" && e.newValue) setAmbientSoundState(e.newValue as AmbientSoundType);
      if (e.key === "ui_ambient_volume" && e.newValue) setAmbientVolumeState(parseFloat(e.newValue));
      if (e.key === "ui_bg_theme" && e.newValue) setBgThemeOverrideState(e.newValue as BgThemeType);
      if (e.key === "ui_has_custom_bg") setBgCustomUrlOverrideState(e.newValue === "true");
    };
    
    const handleCustomEvent = () => {
      try {
        const storedSound = localStorage.getItem("ui_sound_enabled");
        if (storedSound !== null) setSoundEnabledState(storedSound === "true");
        
        const storedClick = localStorage.getItem("ui_click_sound");
        if (storedClick) setClickSoundState(storedClick as ClickSoundType);
        
        const storedAmbient = localStorage.getItem("ui_ambient_sound");
        if (storedAmbient) setAmbientSoundState(storedAmbient as AmbientSoundType);

        const storedVolume = localStorage.getItem("ui_ambient_volume");
        if (storedVolume) setAmbientVolumeState(parseFloat(storedVolume));
        
        const storedTheme = localStorage.getItem("ui_bg_theme");
        if (storedTheme) setBgThemeOverrideState(storedTheme as BgThemeType);
        
        const storedCustomUrl = localStorage.getItem("ui_has_custom_bg");
        if (storedCustomUrl) setBgCustomUrlOverrideState(storedCustomUrl === "true");
      } catch (error) {
        reportPreferenceStorageIssue("sync", error);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("ui_preferences_changed", handleCustomEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("ui_preferences_changed", handleCustomEvent);
    };
  }, []);

  return { 
    soundEnabled, setSoundEnabled, 
    clickSound, setClickSound,
    ambientSound, setAmbientSound,
    ambientVolume, setAmbientVolume,
    bgThemeOverride, setBgThemeOverride,
    bgCustomUrlOverride, setBgCustomUrlOverride
  };
}
