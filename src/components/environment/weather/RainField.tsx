import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { WeatherProfile } from "@/lib/environment/weather-profiles";
import { createSeededRandom } from "@/lib/environment/deterministic-random";
import type { WindRuntime } from "@/lib/environment/wind";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";

function RainLayer({
  layer,
  seedOffset,
  qualityMultiplier,
  wind,
  preferences,
  active,
}: {
  layer: WeatherProfile["layers"]["near"];
  seedOffset: number;
  qualityMultiplier: number;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = Math.floor(layer.density * qualityMultiplier * (preferences.precipitationAmount / 100));

  const geometry = useMemo(() => new THREE.PlaneGeometry(0.015 * layer.scale, 0.4 * layer.scale), [layer.scale]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#a0c0d0",
    transparent: true,
    opacity: layer.opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }), [layer.opacity]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const instanceData = useMemo(() => {
    const prng = createSeededRandom(42 + seedOffset);
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        x: prng.range(-20, 20),
        y: prng.range(0, 30),
        z: prng.range(-15, 5),
        speedMult: prng.range(0.8, 1.2),
      });
    }
    return data;
  }, [count, seedOffset]);

  useFrame(({ clock }) => {
    if (!active || !mesh.current) return;
    
    // If browser is hidden, we could skip updates, but useFrame already halts on tab blur.
    
    const time = clock.elapsedTime;
    const windSpeed = wind.current.current.strength * (preferences.windSpeed / 100);
    const windDir = wind.current.current.x;
    const gust = wind.current.current.gust * (preferences.gustStrength / 100);
    
    const baseSpeed = layer.speed;
    const totalWindX = windDir * (windSpeed * 0.2 + gust * 0.1);

    const tiltAngle = Math.atan2(totalWindX, baseSpeed);

    for (let i = 0; i < count; i++) {
      const d = instanceData[i];
      const dropSpeed = baseSpeed * d.speedMult;
      
      const fallDist = time * dropSpeed;
      const windDrift = time * totalWindX * d.speedMult;

      dummy.position.x = d.x + windDrift;
      dummy.position.y = (d.y - fallDist) % 30;
      if (dummy.position.y < 0) dummy.position.y += 30;
      dummy.position.y -= 10; // offset so rain reaches ground
      
      dummy.position.z = d.z;
      
      dummy.rotation.z = -tiltAngle;
      dummy.updateMatrix();
      
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, material, count]} renderOrder={1} />
  );
}

export function RainField({
  profile,
  quality,
  wind,
  preferences,
  active,
}: {
  profile: WeatherProfile;
  quality: EnvironmentQuality;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
}) {
  const qualityMultiplier = profile.qualityMultipliers[quality.tier] || 1;

  if (!quality.particles || preferences.precipitationAmount === 0) return null;

  return (
    <group>
      <RainLayer layer={profile.layers.far} seedOffset={0} qualityMultiplier={qualityMultiplier} wind={wind} preferences={preferences} active={active} />
      <RainLayer layer={profile.layers.mid} seedOffset={100} qualityMultiplier={qualityMultiplier} wind={wind} preferences={preferences} active={active} />
      {quality.tier === "full" && (
        <RainLayer layer={profile.layers.near} seedOffset={200} qualityMultiplier={qualityMultiplier} wind={wind} preferences={preferences} active={active} />
      )}
    </group>
  );
}
