"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import type { EnvironmentQuality } from "@/lib/environment/quality";

export function EnvironmentLightingRig({
  state,
  preferences,
  quality,
}: {
  state: EnvironmentState;
  preferences: EnvironmentPreferences;
  quality: EnvironmentQuality;
}) {
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const fillLight = useRef<THREE.DirectionalLight>(null);
  const ambientLight = useRef<THREE.HemisphereLight>(null);
  const fog = useRef<THREE.Fog>(null);
  
  const targetKey = useMemo(() => new THREE.Color(state.keyLight), [state.keyLight]);
  const targetFill = useMemo(() => new THREE.Color(state.fillLight), [state.fillLight]);
  const targetFog = useMemo(() => new THREE.Color(state.fogColor), [state.fogColor]);

  useFrame((_, delta) => {
    const blend = Math.min(1, delta * 2.4);
    if (keyLight.current) {
      keyLight.current.color.lerp(targetKey, blend);
      keyLight.current.intensity = THREE.MathUtils.lerp(keyLight.current.intensity, state.keyIntensity * (preferences.brightness / 100), blend);
    }
    if (fillLight.current) {
      fillLight.current.color.lerp(targetFill, blend);
    }
    if (ambientLight.current) {
      ambientLight.current.intensity = THREE.MathUtils.lerp(ambientLight.current.intensity, state.ambientIntensity, blend);
    }
    if (fog.current) {
      fog.current.color.lerp(targetFog, blend);
      fog.current.near = THREE.MathUtils.lerp(fog.current.near, state.fogNear, blend);
      fog.current.far = THREE.MathUtils.lerp(fog.current.far, state.fogFar, blend);
    }
  }, -100);

  return (
    <>
      <fog ref={fog} attach="fog" args={[state.fogColor, state.fogNear, state.fogFar]} />
      <hemisphereLight ref={ambientLight} args={[state.fillLight, state.branchColor, state.ambientIntensity]} />
      <directionalLight 
        ref={keyLight} 
        position={[4.5, 6.2, 5]} 
        intensity={state.keyIntensity} 
        color={state.keyLight} 
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.tier === "full" ? 1024 : 512}
        shadow-mapSize-height={quality.tier === "full" ? 1024 : 512}
        shadow-bias={-0.001}
      >
        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 0.1, 20]} />
      </directionalLight>
      <directionalLight ref={fillLight} position={[-4, 1.5, 3]} intensity={0.42} color={state.fillLight} />
    </>
  );
}
