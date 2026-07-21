"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { ChimeAnchorRect } from "@/lib/wind-chime-anchors";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import { advanceWindRuntime, applyWindInteractionImpulse, createWindRuntime } from "@/lib/environment/wind";

import { EnvironmentLightingRig } from "./EnvironmentLightingRig";
import { VegetationScene } from "./vegetation/VegetationScene";
import { CanopyShadowOverlay } from "./vegetation/CanopyShadowOverlay";
import { WeatherSystem } from "./weather/WeatherSystem";
import { WindChimeScene } from "./WindChimeScene";
import { EnvironmentAtmosphere } from "./EnvironmentParticles"; // Kept for the atmosphere/sky background
import { EnvironmentBirds } from "./EnvironmentBirds";
import { EnvironmentBranches } from "./EnvironmentBranches";
import { SharedBotanicalScene } from "./shared/SharedBotanicalScene";
import { botanicalProfiles } from "@/lib/environment/botanical-profiles";

export function EnvironmentScene({
  state,
  preferences,
  quality,
  anchors,
  reducedMotion,
  active,
}: {
  state: EnvironmentState;
  preferences: EnvironmentPreferences;
  quality: EnvironmentQuality;
  anchors: ChimeAnchorRect[];
  reducedMotion: boolean;
  active: boolean;
}) {
  const wind = useRef(createWindRuntime());

  useEffect(() => {
    const onImpulse = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      if (detail) applyWindInteractionImpulse(wind.current, detail.x, detail.y);
    };
    window.addEventListener("oriana-environment-wind-impulse", onImpulse);
    return () => window.removeEventListener("oriana-environment-wind-impulse", onImpulse);
  }, []);

  useFrame(({ clock }, delta) => {
    if (active && !reducedMotion) {
      advanceWindRuntime(wind.current, clock.elapsedTime, Math.min(delta, 0.05), preferences, state.wind);
    }
  });

  // Preserve scale adjustments from user preferences
  const scaleZ = 0.65 + preferences.spatialDepth / 100 * 0.7;

  const dev = typeof window !== "undefined" ? (window as any).__DEV_LAB__ || {} : {};

  return (
    <>
      <EnvironmentLightingRig state={state} preferences={preferences} quality={quality} />
      
      <group scale={[1, 1, scaleZ]}>
        {!dev.vegetationOnly && state.preset !== "mist" && (
          <EnvironmentAtmosphere state={state} preferences={preferences} wind={wind} active={active && !reducedMotion} />
        )}
        
        {!dev.atmosphereOnly && (state.preset === "sakura" ? (
          <VegetationScene state={state} preferences={preferences} wind={wind} active={active && !reducedMotion} reduced={quality.tier === "reduced"} />
        ) : state.preset === "rain" ? (
          <SharedBotanicalScene profile={botanicalProfiles.willow} quality={quality} wind={wind} preferences={preferences} active={active && !reducedMotion} />
        ) : state.preset === "autumn" ? (
          <SharedBotanicalScene
            profile={botanicalProfiles.maple}
            secondaryProfile={botanicalProfiles.ginkgo}
            quality={quality}
            wind={wind}
            preferences={preferences}
            active={active && !reducedMotion}
          />
        ) : state.preset === "mist" ? (
          <SharedBotanicalScene profile={botanicalProfiles.cedar} quality={quality} wind={wind} preferences={preferences} active={active && !reducedMotion} />
        ) : (
          <EnvironmentBranches state={state} preferences={preferences} wind={wind} active={active && !reducedMotion} reduced={quality.tier === "reduced"} />
        ))}
        {!dev.atmosphereOnly && <CanopyShadowOverlay state={state} active={active} />}
        
        {!dev.vegetationOnly && (
          <WeatherSystem state={state} quality={quality} wind={wind} preferences={preferences} reducedMotion={reducedMotion} active={active && !reducedMotion} />
        )}
        {!dev.atmosphereOnly && (
          <EnvironmentBirds state={state} preferences={preferences} quality={quality} wind={wind} active={active && !reducedMotion} />
        )}
      </group>
      
      {!dev.atmosphereOnly && !dev.vegetationOnly && (
        <WindChimeScene
          anchors={anchors.slice(0, quality.chimeCap)}
        reducedMotion={reducedMotion}
        wind={wind}
        preferences={preferences}
        state={state}
        active={active}
      />
      )}
    </>
  );
}

