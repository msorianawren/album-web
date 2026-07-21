"use client";

import type { EnvironmentState } from "@/lib/environment/presets";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function CanopyShadowOverlay({
  state,
  active,
}: {
  state: EnvironmentState;
  active: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // A subtle screen-space plane or a plane positioned just behind the hero character
  // that receives shadow from the 3D trees and overlays it naturally.
  useFrame(({ clock }) => {
    if (!active) return;
    // Animate subtle shadow shifting if using a baked texture
    // Or just let the dynamic lighting handle it.
  });

  return (
    <mesh position={[0, 0, -5]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <shadowMaterial opacity={0.15} />
    </mesh>
  );
}
