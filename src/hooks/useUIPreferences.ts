"use client";

import { useEffect, useState } from "react";
import { imageStore } from "@/lib/idb";

export type ClickSoundType = "water" | "crystal" | "wood" | "chime" | "thud";
export type BgThemeType = "default" | "sakura" | "fireflies" | "snow" | "autumn" | "mist" | "rain";
export type AmbientSoundType = "auto" | "harp" | "piano" | "silence" | "pad" | "drone" | "rain" | "cave";

interface UIPreferences {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  clickSound: ClickSoundType;
  setClickSound: (sound: ClickSoundType) => void;
  ambientSound: AmbientSoundType;
  setAmbientSound: (sound: AmbientSoundType) => void;
  bgThemeOverride: BgThemeType;
  setBgThemeOverride: (theme: BgThemeType) => void;
  bgCustomUrlOverride: boolean;
  setBgCustomUrlOverride: (hasCustom: boolean) => void;
}

export function useUIPreferences(): UIPreferences {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [clickSound, setClickSoundState] = useState<ClickSoundType>("water");
  const [ambientSound, setAmbientSoundState] = useState<AmbientSoundType>("auto");
  const [bgThemeOverride, setBgThemeOverrideState] = useState<BgThemeType>("default");
  const [bgCustomUrlOverride, setBgCustomUrlOverrideState] = useState(false);

  useEffect(() => {
    try {
      const storedSound = localStorage.getItem("ui_sound_enabled");
      if (storedSound !== null) setSoundEnabledState(storedSound === "true");
      
      const storedClick = localStorage.getItem("ui_click_sound");
      if (storedClick) setClickSoundState(storedClick as ClickSoundType);

      const storedAmbient = localStorage.getItem("ui_ambient_sound");
      if (storedAmbient) setAmbientSoundState(storedAmbient as AmbientSoundType);
      
      const storedTheme = localStorage.getItem("ui_bg_theme");
      if (storedTheme) setBgThemeOverrideState(storedTheme as BgThemeType);
      
      const storedCustomUrl = localStorage.getItem("ui_has_custom_bg");
      if (storedCustomUrl) setBgCustomUrlOverrideState(storedCustomUrl === "true");
    } catch (e) {}
  }, []);

  const dispatchCustomEvent = () => window.dispatchEvent(new CustomEvent("ui_preferences_changed"));

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem("ui_sound_enabled", enabled.toString());
      dispatchCustomEvent();
    } catch (e) {}
  };

  const setClickSound = (sound: ClickSoundType) => {
    setClickSoundState(sound);
    try {
      localStorage.setItem("ui_click_sound", sound);
      dispatchCustomEvent();
    } catch (e) {}
  };

  const setAmbientSound = (sound: AmbientSoundType) => {
    setAmbientSoundState(sound);
    try {
      localStorage.setItem("ui_ambient_sound", sound);
      dispatchCustomEvent();
    } catch (e) {}
  };

  const setBgThemeOverride = (theme: BgThemeType) => {
    setBgThemeOverrideState(theme);
    try {
      localStorage.setItem("ui_bg_theme", theme);
      dispatchCustomEvent();
    } catch (e) {}
  };

  const setBgCustomUrlOverride = (hasCustom: boolean) => {
    setBgCustomUrlOverrideState(hasCustom);
    try {
      localStorage.setItem("ui_has_custom_bg", hasCustom.toString());
      dispatchCustomEvent();
    } catch (e) {}
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ui_sound_enabled") setSoundEnabledState(e.newValue === "true");
      if (e.key === "ui_click_sound" && e.newValue) setClickSoundState(e.newValue as ClickSoundType);
      if (e.key === "ui_ambient_sound" && e.newValue) setAmbientSoundState(e.newValue as AmbientSoundType);
      if (e.key === "ui_bg_theme" && e.newValue) setBgThemeOverrideState(e.newValue as BgThemeType);
      if (e.key === "ui_has_custom_bg") setBgCustomUrlOverrideState(e.newValue === "true");
    };
    const handleCustom = () => {
      const storedSound = localStorage.getItem("ui_sound_enabled");
      if (storedSound !== null) setSoundEnabledState(storedSound === "true");
      const storedClick = localStorage.getItem("ui_click_sound");
      if (storedClick) setClickSoundState(storedClick as ClickSoundType);
      const storedAmbient = localStorage.getItem("ui_ambient_sound");
      if (storedAmbient) setAmbientSoundState(storedAmbient as AmbientSoundType);
      const storedTheme = localStorage.getItem("ui_bg_theme");
      if (storedTheme) setBgThemeOverrideState(storedTheme as BgThemeType);
      const storedCustomUrl = localStorage.getItem("ui_has_custom_bg");
      if (storedCustomUrl !== null) setBgCustomUrlOverrideState(storedCustomUrl === "true");
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("ui_preferences_changed", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("ui_preferences_changed", handleCustom);
    };
  }, []);

  return { 
    soundEnabled, setSoundEnabled, 
    clickSound, setClickSound,
    ambientSound, setAmbientSound,
    bgThemeOverride, setBgThemeOverride,
    bgCustomUrlOverride, setBgCustomUrlOverride
  };
}
