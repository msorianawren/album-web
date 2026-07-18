"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ChimeAnchorRect } from "@/lib/wind-chime-anchors";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import { advanceWindRuntime, applyWindInteractionImpulse, createWindRuntime } from "@/lib/environment/wind";
import { EnvironmentAtmosphere, EnvironmentParticles } from "./EnvironmentParticles";
import { EnvironmentBranches } from "./EnvironmentBranches";
import { EnvironmentBirds } from "./EnvironmentBirds";
import { WindChimeScene } from "./WindChimeScene";

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
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const fillLight = useRef<THREE.DirectionalLight>(null);
  const ambientLight = useRef<THREE.HemisphereLight>(null);
  const fog = useRef<THREE.Fog>(null);
  const targetKey = useMemo(() => new THREE.Color(state.keyLight), [state.keyLight]);
  const targetFill = useMemo(() => new THREE.Color(state.fillLight), [state.fillLight]);
  const targetFog = useMemo(() => new THREE.Color(state.fogColor), [state.fogColor]);

  useEffect(() => {
    const onImpulse = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      if (detail) applyWindInteractionImpulse(wind.current, detail.x, detail.y);
    };
    window.addEventListener("oriana-environment-wind-impulse", onImpulse);
    return () => window.removeEventListener("oriana-environment-wind-impulse", onImpulse);
  }, []);

  useFrame(({ clock }, delta) => {
    if (active && !reducedMotion) advanceWindRuntime(wind.current, clock.elapsedTime, Math.min(delta, .05), preferences, state.wind);
    if (keyLight.current) {
      keyLight.current.color.lerp(targetKey, Math.min(1, delta * 2.4));
      keyLight.current.intensity = THREE.MathUtils.lerp(keyLight.current.intensity, state.keyIntensity * preferences.brightness / 100, Math.min(1, delta * 2.4));
    }
    if (fillLight.current) fillLight.current.color.lerp(targetFill, Math.min(1, delta * 2.2));
    if (ambientLight.current) ambientLight.current.intensity = THREE.MathUtils.lerp(ambientLight.current.intensity, state.ambientIntensity, Math.min(1, delta * 2.2));
    if (fog.current) {
      fog.current.color.lerp(targetFog, Math.min(1, delta * 2.2));
      fog.current.near = THREE.MathUtils.lerp(fog.current.near, state.fogNear, Math.min(1, delta * 2.2));
      fog.current.far = THREE.MathUtils.lerp(fog.current.far, state.fogFar, Math.min(1, delta * 2.2));
    }
  }, -100);

  return (
    <>
      <fog ref={fog} attach="fog" args={[state.fogColor, state.fogNear, state.fogFar]} />
      <hemisphereLight ref={ambientLight} args={[state.fillLight, state.branchColor, state.ambientIntensity]} />
      <directionalLight ref={keyLight} position={[4.5, 6.2, 5]} intensity={state.keyIntensity} color={state.keyLight} castShadow={quality.shadows} />
      <directionalLight ref={fillLight} position={[-4, 1.5, 3]} intensity={.42} color={state.fillLight} />
      <group scale={[1, 1, .65 + preferences.spatialDepth / 100 * .7]}>
        <EnvironmentAtmosphere state={state} preferences={preferences} wind={wind} active={active && !reducedMotion} />
        <EnvironmentBranches state={state} preferences={preferences} wind={wind} active={active && !reducedMotion} reduced={quality.tier === "reduced"} />
        <EnvironmentParticles state={state} preferences={preferences} quality={quality} wind={wind} active={active && !reducedMotion} />
        <EnvironmentBirds state={state} preferences={preferences} quality={quality} wind={wind} active={active && !reducedMotion} />
      </group>
      <WindChimeScene
        anchors={anchors.slice(0, quality.chimeCap)}
        reducedMotion={reducedMotion}
        wind={wind}
        preferences={preferences}
        state={state}
        active={active}
      />
    </>
  );
}
