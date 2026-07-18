"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useUIPreferences } from "@/hooks/useUIPreferences";
import { audioUX } from "@/lib/audio-ux";
import { birdActivityMultiplier, birdSongMultiplier, resolveBirdState } from "@/lib/environment/bird-behavior";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { WindRuntime } from "@/lib/environment/wind";

type BirdRefs = { group?: THREE.Group | null; left?: THREE.Mesh | null; right?: THREE.Mesh | null };

export function EnvironmentBirds({ state, preferences, quality, wind, active }: {
  state: EnvironmentState;
  preferences: EnvironmentPreferences;
  quality: EnvironmentQuality;
  wind: React.MutableRefObject<WindRuntime>;
  active: boolean;
}) {
  const refs = useRef<BirdRefs[]>([]);
  const nextChirp = useRef(4);
  const { soundEnabled } = useUIPreferences();
  const count = Math.max(0, Math.round(quality.birdCap * preferences.birdDensity / 100 * birdActivityMultiplier(state.preset, state.phase)));
  const birds = useMemo(() => Array.from({ length: quality.birdCap }, (_, index) => ({
    speed: .016 + (index % 4) * .004,
    offset: index / Math.max(quality.birdCap, 1),
    y: 1.1 + (index % 3) * .72,
    z: -1.2 - (index % 4) * 1.15,
  })), [quality.birdCap]);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    refs.current.forEach((bird, index) => {
      if (!bird?.group) return;
      const visible = active && index < count;
      bird.group.visible = visible;
      if (!visible) return;
      const config = birds[index];
      const progress = (elapsed * config.speed + config.offset) % 1;
      const birdState = resolveBirdState(progress);
      const flightProgress = progress < .9 ? progress / .9 : (progress - .9) / .1;
      const side = index % 2 === 0 ? 1 : -1;
      const flyingX = side * (6.4 - flightProgress * 12.8) + wind.current.current.x * .8;
      const perchX = side * (4.25 + (index % 2) * .25);
      const perched = birdState === "perched";
      const approaching = birdState === "approaching" || birdState === "taking_off";
      const blend = approaching ? Math.min(1, Math.max(0, (progress - .56) / .12)) : perched ? 1 : 0;
      bird.group.position.set(
        THREE.MathUtils.lerp(flyingX, perchX, blend),
        THREE.MathUtils.lerp(config.y + Math.sin(elapsed * 1.2 + index) * .18, 1.75 + index % 2 * .42, blend),
        config.z,
      );
      bird.group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      const wing = perched ? .15 : Math.sin(elapsed * 10 + index) * .58;
      if (bird.left) bird.left.rotation.z = .4 + wing;
      if (bird.right) bird.right.rotation.z = -.4 - wing;
    });

    const songMultiplier = birdSongMultiplier(state.preset, state.phase) * state.birdSong * preferences.birdSongFrequency / 100;
    if (active && soundEnabled && count > 0 && songMultiplier > 0 && elapsed >= nextChirp.current) {
      const pan = Math.sin(elapsed * .31) * .7;
      audioUX.playBirdChirp({ pan, brightness: state.phase === "night" ? .45 : .9 });
      nextChirp.current = elapsed + Math.max(4, 16 - songMultiplier * 11);
    }
  });

  return (
    <group>
      {birds.map((bird, index) => (
        <group key={index} ref={(node) => { refs.current[index] = { ...(refs.current[index] ?? {}), group: node }; }} position={[0, bird.y, bird.z]} scale={.2 + (bird.z + 5) * .018}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[.2, .65, 7]} />
            <meshStandardMaterial color={state.phase === "night" ? "#28313c" : "#71665b"} roughness={.8} />
          </mesh>
          <mesh position={[.34, .08, 0]}>
            <sphereGeometry args={[.17, 8, 6]} />
            <meshStandardMaterial color={state.phase === "night" ? "#303946" : "#8a7768"} roughness={.78} />
          </mesh>
          <mesh ref={(node) => { refs.current[index] = { ...(refs.current[index] ?? {}), left: node }; }} position={[0, .06, .2]} rotation={[0, 0, .4]}>
            <coneGeometry args={[.16, .52, 5]} />
            <meshStandardMaterial color="#5f5751" roughness={.84} />
          </mesh>
          <mesh ref={(node) => { refs.current[index] = { ...(refs.current[index] ?? {}), right: node }; }} position={[0, .06, -.2]} rotation={[Math.PI, 0, -.4]}>
            <coneGeometry args={[.16, .52, 5]} />
            <meshStandardMaterial color="#5f5751" roughness={.84} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
