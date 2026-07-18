"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { WindRuntime } from "@/lib/environment/wind";

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.317 + salt * 17.17) * 43758.5453;
  return value - Math.floor(value);
}

export function EnvironmentParticles({
  state,
  preferences,
  quality,
  wind,
  active,
}: {
  state: EnvironmentState;
  preferences: EnvironmentPreferences;
  quality: EnvironmentQuality;
  wind: React.MutableRefObject<WindRuntime>;
  active: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const targetColor = useMemo(() => new THREE.Color(state.particle[0]), [state.particle]);
  const activityMultiplier = state.preset === "fireflies" ? Math.max(.04, state.fireflies) : 1;
  const count = Math.max(0, Math.round(quality.particleCap * preferences.particleAmount / 100 * activityMultiplier));
  const particles = useMemo(() => Array.from({ length: count }, (_, index) => ({
    x: seeded(index, 1) * 12 - 6,
    y: seeded(index, 2) * 9 - 4.5,
    z: seeded(index, 3) * 7 - 4.5,
    speed: .18 + seeded(index, 4) * .52,
    phase: seeded(index, 5) * Math.PI * 2,
    scale: .35 + seeded(index, 6) * .85,
  })), [count]);

  useEffect(() => {
    if (!mesh.current) return;
    mesh.current.count = count;
    particles.forEach((particle, index) => {
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.rotation.set(0, particle.phase, state.preset === "rain" ? -.18 : particle.phase * .2);
      const depthScale = particle.scale * (1 + (particle.z + 4.5) * .035);
      dummy.scale.setScalar(depthScale);
      if (state.preset === "rain") dummy.scale.set(.16, 2.8, .16);
      if (state.preset === "mist") dummy.scale.set(3.8, 1.2, .2);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [count, dummy, particles, state.preset]);

  useFrame(({ clock }, delta) => {
    material.current?.color.lerp(targetColor, Math.min(1, delta * 2.4));
    if (!mesh.current || !active || count === 0) return;
    const field = wind.current.current;
    const elapsed = clock.elapsedTime;
    particles.forEach((particle, index) => {
      const fall = state.preset === "fireflies" || state.preset === "mist" ? 0 : particle.speed * delta * (state.preset === "rain" ? 7 : 1.25);
      particle.y -= fall;
      particle.x += field.x * delta * particle.speed * (state.preset === "rain" ? 1.8 : .72);
      if (particle.y < -5.2) particle.y = 5.2;
      if (particle.x > 6.8) particle.x = -6.8;
      if (particle.x < -6.8) particle.x = 6.8;
      const floatY = state.preset === "fireflies" || state.preset === "mist" ? Math.sin(elapsed * particle.speed + particle.phase) * .48 : 0;
      dummy.position.set(particle.x, particle.y + floatY, particle.z);
      dummy.rotation.set(0, elapsed * .15 + particle.phase, state.preset === "rain" ? -.18 : Math.sin(elapsed + particle.phase) * .4);
      const depthScale = particle.scale * (1 + (particle.z + 4.5) * .035);
      const fireflyPulse = state.preset === "fireflies" ? .6 + Math.sin(elapsed * 1.4 + particle.phase) * .35 : 1;
      dummy.scale.setScalar(depthScale * fireflyPulse);
      if (state.preset === "rain") dummy.scale.set(.16, 2.8, .16);
      if (state.preset === "mist") dummy.scale.set(3.8, 1.2, .2);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  const geometry = state.preset === "rain"
    ? <cylinderGeometry args={[.012, .012, .7, 4]} />
    : state.preset === "sakura" || state.preset === "autumn"
      ? <sphereGeometry args={[.085, 5, 4]} />
      : <sphereGeometry args={[state.preset === "mist" ? .42 : .045, 6, 5]} />;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      {geometry}
      <meshBasicMaterial
        ref={material}
        color={state.particle[0]}
        transparent
        opacity={state.preset === "mist" ? preferences.atmosphere / 260 : state.preset === "fireflies" ? .78 : .62}
        depthWrite={false}
        blending={state.preset === "fireflies" ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </instancedMesh>
  );
}

export function EnvironmentAtmosphere({ state, preferences, wind, active }: {
  state: EnvironmentState;
  preferences: EnvironmentPreferences;
  wind: React.MutableRefObject<WindRuntime>;
  active: boolean;
}) {
  const planes = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    if (!active) return;
    planes.current.forEach((plane, index) => {
      if (!plane) return;
      plane.position.x = Math.sin(clock.elapsedTime * (.035 + index * .012) + index) * (1.2 + wind.current.current.strength);
      plane.rotation.z = Math.sin(clock.elapsedTime * .04 + index) * .025;
    });
  });
  return (
    <group>
      {[-5.5, -2.7, .2].map((z, index) => (
        <mesh key={z} ref={(node) => { planes.current[index] = node; }} position={[0, index - 1, z]}>
          <planeGeometry args={[16, 7]} />
          <meshBasicMaterial color={state.fogColor} transparent opacity={(preferences.atmosphere / 100) * (.075 + index * .025)} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
