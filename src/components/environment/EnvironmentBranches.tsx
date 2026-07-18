"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import type { WindRuntime } from "@/lib/environment/wind";

const branchPositions: Array<[number, number, number, number]> = [
  [-12.5, 3.4, -2.8, -.2],
  [7.35, 3.1, -2.2, .2],
  [-7.2, -2.5, .8, -.5],
  [7.2, -2.7, .3, .5],
];

export function EnvironmentBranches({
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
  const groups = useRef<Array<THREE.Group | null>>([]);
  const branchMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#625048", roughness: .78, metalness: .02 }), []);
  const leafMaterials = useMemo(() => [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: "#d8c8bd", roughness: .72, side: THREE.DoubleSide })), []);
  const targetBranch = useMemo(() => new THREE.Color(state.branchColor), [state.branchColor]);
  const targetFoliage = useMemo(() => state.foliage.map((color) => new THREE.Color(color)), [state.foliage]);
  const leafCount = reduced ? 4 : Math.max(5, Math.round(5 + preferences.environmentDensity / 14));

  useEffect(() => () => {
    branchMaterial.dispose();
    leafMaterials.forEach((material) => material.dispose());
  }, [branchMaterial, leafMaterials]);

  useFrame(({ clock }, delta) => {
    const blend = Math.min(1, delta * 2.2);
    branchMaterial.color.lerp(targetBranch, blend);
    leafMaterials.forEach((material, index) => material.color.lerp(targetFoliage[index], blend));
    if (!active) return;
    const strength = wind.current.current.strength * preferences.branchSway / 100;
    groups.current.forEach((group, index) => {
      if (!group) return;
      const direction = index % 2 === 0 ? 1 : -1;
      group.rotation.z = branchPositions[index][3] + Math.sin(clock.elapsedTime * .55 + index) * strength * .055 * direction;
      group.rotation.y = Math.sin(clock.elapsedTime * .37 + index * .8) * strength * .05;
    });
  });

  return (
    <group>
      {branchPositions.map(([x, y, z, rotation], index) => (
        <group key={index} ref={(node) => { groups.current[index] = node; }} position={[x, y, z]} rotation={[0, 0, rotation]}>
          <mesh material={branchMaterial} position={[0, -1.35, 0]} castShadow={!reduced}>
            <cylinderGeometry args={[.11, .22, 3.4, 9]} />
          </mesh>
          <mesh material={branchMaterial} position={[.55, -1.25, 0]} rotation={[0, 0, -.72]}>
            <cylinderGeometry args={[.055, .11, 1.65, 8]} />
          </mesh>
          {Array.from({ length: leafCount }, (_, leafIndex) => {
            const offset = leafIndex - (leafCount - 1) / 2;
            const angle = leafIndex * 2.4 + index;
            return (
              <mesh
                key={leafIndex}
                material={leafMaterials[leafIndex % leafMaterials.length]}
                position={[Math.sin(angle) * .65, -1.1 + offset * .31, Math.cos(angle) * .22]}
                rotation={[.15, angle, angle * .2]}
                scale={state.preset === "snow" ? .42 : state.preset === "mist" || state.preset === "rain" ? .56 : .72}
              >
                <sphereGeometry args={[.24, 7, 5]} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}
