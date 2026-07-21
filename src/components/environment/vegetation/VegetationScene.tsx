"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import type { WindRuntime } from "@/lib/environment/wind";
import { BotanicalTree } from "./BotanicalTree";
import { FoliageInstances } from "./FoliageInstances";
import { BlossomClusters } from "./BlossomClusters";

export function VegetationScene({
  state,
  preferences,
  wind,
  active,
  reduced,
}: {
  state: EnvironmentState;
  preferences: EnvironmentPreferences;
  wind: React.MutableRefObject<WindRuntime>;
  active: boolean;
  reduced: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (!active || !groupRef.current) return;
    
    // Very subtle root movement
    const strength = (wind.current.current.strength * preferences.branchSway) / 100;
    groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.15) * strength * 0.01;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.1) * strength * 0.005;
  });

  return (
    <group ref={groupRef}>
      {/* Primary Hero Sakura - Pushed to the left edge to avoid center UI */}
      <group position={[-10.5, -5.5, -3]} rotation={[0, 0, 0]}>
        <BotanicalTree state={state} active={active} wind={wind} reduced={reduced} />
        <FoliageInstances state={state} active={active} wind={wind} reduced={reduced} />
        <BlossomClusters state={state} active={active} wind={wind} reduced={reduced} />
      </group>
      
      {/* Secondary Background Sakura - Pushed to the right edge */}
      <group position={[12, -4.5, -6]} rotation={[0, Math.PI * 0.6, 0]} scale={0.75}>
        <BotanicalTree state={state} active={active} wind={wind} reduced={reduced} />
        <FoliageInstances state={state} active={active} wind={wind} reduced={reduced} />
        <BlossomClusters state={state} active={active} wind={wind} reduced={reduced} />
      </group>
    </group>
  );
}
