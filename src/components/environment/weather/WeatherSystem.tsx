"use client";

import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { WindRuntime } from "@/lib/environment/wind";
import { artistEnvironmentDefaults } from "@/lib/environment/preferences";
import { SakuraPetalField } from "./SakuraPetalField";

// We can keep the old EnvironmentParticles for other presets (snow, rain, fireflies) 
// by importing it if the state isn't sakura, or we just render Sakura petals for now.
import { EnvironmentParticles } from "../EnvironmentParticles";

export function WeatherSystem({
  state,
  quality,
  wind,
  active,
}: {
  state: EnvironmentState;
  quality: EnvironmentQuality;
  wind: React.MutableRefObject<WindRuntime>;
  active: boolean;
}) {
  if (!quality.particles) return null;

  if (state.preset === "sakura") {
    return <SakuraPetalField state={state} active={active} wind={wind} quality={quality} />;
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
