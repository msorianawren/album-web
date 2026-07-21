import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { BotanicalArchetype } from "@/lib/environment/botanical-profiles";
import { createSeededRandom } from "@/lib/environment/deterministic-random";
import { getLeafGeometry } from "@/lib/environment/leaf-geometries";
import type { WindRuntime } from "@/lib/environment/wind";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";

export function FoliageInstances({
  profile,
  position,
  scale = 1,
  seedOffset,
  qualityMultiplier,
  wind,
  preferences,
  active,
}: {
  profile: BotanicalArchetype;
  position: [number, number, number];
  scale?: number;
  seedOffset: number;
  qualityMultiplier: number;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = Math.floor(profile.foliage.density * qualityMultiplier);

  const colors = useMemo(() => profile.foliage.colors.map(c => new THREE.Color(c)), [profile.foliage.colors]);

  // Use the shared cached geometry for this leaf type
  const leafGeometry = useMemo(
    () => getLeafGeometry(profile.foliage.leafType),
    [profile.foliage.leafType]
  );

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.8,
    side: THREE.DoubleSide,
  }), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const instanceData = useMemo(() => {
    const prng = createSeededRandom(profile.seed * 2 + seedOffset);
    const upBias = profile.branching.upwardBias ?? 0;
    const data = [];
    for (let i = 0; i < count; i++) {
      const radius = prng.range(2, 6) * profile.branching.spread * scale;
      const angle = prng.range(0, Math.PI * 2);
      // upwardBias lifts leaves: positive bias → upward cluster, negative → droop
      const heightBase = upBias > 0
        ? prng.range(0, 4) * upBias * scale           // tends upward
        : prng.range(-4, 2) * scale;                   // willow droop default
      const droopOffset = -Math.pow(radius / (6 * scale), 2) * profile.branching.droop * 2;

      const pos = new THREE.Vector3(
        Math.cos(angle) * radius,
        heightBase + droopOffset,
        Math.sin(angle) * radius
      );

      const rot = new THREE.Euler(
        prng.range(0, Math.PI),
        prng.range(0, Math.PI * 2),
        prng.range(0, Math.PI)
      );

      const s = prng.range(profile.foliage.scaleRange[0], profile.foliage.scaleRange[1]) * scale;
      const leafScale = new THREE.Vector3(
        s * profile.foliage.aspectRatio,
        s,
        s * profile.foliage.aspectRatio
      );

      const phase = prng.range(0, Math.PI * 2);
      const speed = prng.range(0.8, 1.2);

      data.push({
        pos, rot, scale: leafScale, phase, speed,
        colorIndex: Math.floor(prng.range(0, colors.length)),
      });
    }
    return data;
  }, [profile, count, scale, seedOffset, colors.length]);

  useEffect(() => {
    if (!mesh.current) return;
    for (let i = 0; i < count; i++) {
      const d = instanceData[i];
      dummy.position.copy(d.pos);
      dummy.rotation.copy(d.rot);
      dummy.scale.copy(d.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      mesh.current.setColorAt(i, colors[d.colorIndex]);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [count, instanceData, dummy, colors]);

  useFrame(({ clock }) => {
    if (!active || !mesh.current) return;
    const time = clock.elapsedTime;
    const windSpeed = wind.current.current.strength * (preferences.windSpeed / 100);
    const flutterIntensity = profile.foliage.flutter * (preferences.branchSway / 100);

    for (let i = 0; i < count; i++) {
      const d = instanceData[i];
      dummy.position.copy(d.pos);

      // Wind flutter
      dummy.rotation.x = d.rot.x + Math.sin(time * d.speed + d.phase) * flutterIntensity * 0.1;
      dummy.rotation.z = d.rot.z + Math.cos(time * d.speed * 0.8 + d.phase) * flutterIntensity * 0.1;

      // Global wind sway
      dummy.position.x += wind.current.current.x * windSpeed * profile.foliage.windDrag * 0.5 * Math.sin(time + d.phase);

      dummy.scale.copy(d.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={position}>
      <instancedMesh ref={mesh} args={[leafGeometry, material, count]} castShadow />
    </group>
  );
}
