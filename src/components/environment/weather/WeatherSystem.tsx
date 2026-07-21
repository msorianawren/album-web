"use client";

import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { WindRuntime } from "@/lib/environment/wind";
import { artistEnvironmentDefaults } from "@/lib/environment/preferences";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import { SakuraPetalField } from "./SakuraPetalField";
import { RainField } from "./RainField";
import { AutumnLeafField } from "./AutumnLeafField";
import { weatherProfiles } from "@/lib/environment/weather-profiles";

// We can keep the old EnvironmentParticles for other presets (snow, rain, fireflies) 
// by importing it if the state isn't sakura, or we just render Sakura petals for now.
import { EnvironmentParticles } from "../EnvironmentParticles";

export function WeatherSystem({
  state,
  quality,
  wind,
  preferences,
  active,
  reducedMotion,
}: {
  state: EnvironmentState;
  quality: EnvironmentQuality;
  wind: React.MutableRefObject<WindRuntime>;
  preferences?: EnvironmentPreferences;
  active: boolean;
  reducedMotion?: boolean;
}) {
  const prefs = preferences || artistEnvironmentDefaults;
  const rm = reducedMotion ?? false;
  if (!quality.particles) return null;

  if (state.preset === "sakura") {
    return <SakuraPetalField state={state} active={active} wind={wind} quality={quality} />;
  }

  if (state.preset === "rain") {
    return <RainField profile={weatherProfiles.rain} quality={quality} wind={wind} preferences={prefs} active={active} />;
  }

  if (state.preset === "autumn") {
    return <AutumnLeafField quality={quality} wind={wind} preferences={prefs} active={active} reducedMotion={rm} />;
  }

  // Fallback to the original particles for other presets to avoid regression
  return (
    <EnvironmentParticles 
      state={state} 
      preferences={{ ...artistEnvironmentDefaults, preset: state.preset, phase: state.phase }}

      quality={quality} 
      wind={wind} 
      active={active} 
    />
  );
}
