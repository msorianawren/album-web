"use client";

import { useFrame } from "@react-three/fiber";
import { lazy, useEffect, useRef } from "react";
import type { ChimeAnchorRect } from "@/lib/wind-chime-anchors";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import { advanceWindRuntime, applyWindInteractionImpulse, createWindRuntime } from "@/lib/environment/wind";

const EnvironmentLightingRig = lazy(() => import("./EnvironmentLightingRig").then((module) => ({ default: module.EnvironmentLightingRig })));
const VegetationScene = lazy(() => import("./vegetation/VegetationScene").then((module) => ({ default: module.VegetationScene })));
const CanopyShadowOverlay = lazy(() => import("./vegetation/CanopyShadowOverlay").then((module) => ({ default: module.CanopyShadowOverlay })));
const WeatherSystem = lazy(() => import("./weather/WeatherSystem").then((module) => ({ default: module.WeatherSystem })));
const WindChimeScene = lazy(() => import("./WindChimeScene").then((module) => ({ default: module.WindChimeScene })));
const EnvironmentParticles = lazy(() => import("./EnvironmentParticles").then((module) => ({ default: module.EnvironmentParticles })));
const EnvironmentAtmosphere = lazy(() => import("./EnvironmentParticles").then((module) => ({ default: module.EnvironmentAtmosphere })));
const EnvironmentBirds = lazy(() => import("./EnvironmentBirds").then((module) => ({ default: module.EnvironmentBirds })));
const EnvironmentBranches = lazy(() => import("./EnvironmentBranches").then((module) => ({ default: module.EnvironmentBranches })));
const SharedBotanicalScene = lazy(() => import("./shared/SharedBotanicalScene").then((module) => ({ default: module.SharedBotanicalScene })));

import { botanicalProfiles } from "@/lib/environment/botanical-profiles";
import { getEnvironmentDevLabState } from "@/lib/environment/dev-lab";
import { Snowman } from "./Snowman";
import { EnvironmentPineForest } from "./EnvironmentPineForest";

export function EnvironmentScene({
  state,
  preferences,
  quality,
  anchors,
  reducedMotion,
  active,
  chimeOnly = false,
}: {
  state: EnvironmentState;
  preferences: EnvironmentPreferences;
  quality: EnvironmentQuality;
  anchors: ChimeAnchorRect[];
  reducedMotion: boolean;
  active: boolean;
  chimeOnly?: boolean;
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

  const dev = getEnvironmentDevLabState();

  return (
    <>
      <EnvironmentLightingRig state={state} preferences={preferences} quality={quality} />
      
      {!chimeOnly ? <group scale={[1, 1, scaleZ]}>
        {!dev.vegetationOnly && state.preset !== "mist" && (
          <>
            <EnvironmentAtmosphere state={state} preferences={preferences} wind={wind} active={active && !reducedMotion} />
            <EnvironmentParticles state={state} preferences={preferences} quality={quality} wind={wind} active={active && !reducedMotion} />
          </>
        )}
        
        {!dev.atmosphereOnly && (state.preset === "sakura" ? (
          <VegetationScene state={state} preferences={preferences} wind={wind} active={active && !reducedMotion} reduced={quality.tier === "reduced"} />
        ) : state.preset === "snow" ? (
          <group>
            <EnvironmentPineForest count={100} scale={1.2} />
            <Snowman position={[2, -2, -2]} scale={0.7} />
          </group>
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
        ) : state.preset === "fireflies" ? (
          <SharedBotanicalScene profile={botanicalProfiles.oak} quality={quality} wind={wind} preferences={preferences} active={active && !reducedMotion} />
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
      </group> : null}
      
      {!dev.atmosphereOnly && !dev.vegetationOnly && anchors.length > 0 && (
        <WindChimeScene
          anchors={anchors.slice(0, quality.chimeCap)}
          reducedMotion={reducedMotion}
          wind={wind}
          preferences={preferences}
          state={state}
          active={active}
          demandDriven={chimeOnly}
        />
      )}
    </>
  );
}
