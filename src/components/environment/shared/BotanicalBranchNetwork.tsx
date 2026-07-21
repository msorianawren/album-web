import * as THREE from "three";
import { useMemo } from "react";
import type { BotanicalArchetype } from "@/lib/environment/botanical-profiles";
import { createSeededRandom } from "@/lib/environment/deterministic-random";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";

function generateBranchCurve(start: THREE.Vector3, end: THREE.Vector3, droop: number, prng: ReturnType<typeof createSeededRandom>) {
  const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
  mid.y -= droop * (0.5 + prng.value() * 0.5);
  mid.x += (prng.value() - 0.5) * droop * 0.5;
  mid.z += (prng.value() - 0.5) * droop * 0.5;
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

export function BotanicalBranchNetwork({
  profile,
  position,
  scale = 1,
  seedOffset,
  material,
  preferences,
}: {
  profile: BotanicalArchetype;
  position: [number, number, number];
  scale?: number;
  seedOffset: number;
  material: THREE.Material;
  preferences: EnvironmentPreferences;
}) {
  const geometries = useMemo(() => {
    const prng = createSeededRandom(profile.seed + seedOffset);
    const geoms: THREE.TubeGeometry[] = [];
    const root = new THREE.Vector3(0, 0, 0);
    
    // Main branches
    for (let i = 0; i < profile.branching.segments; i++) {
      const angle = prng.range(0, Math.PI * 2);
      const radius = prng.range(3, 6) * profile.branching.spread * scale;
      const height = prng.range(-2, 2) * scale;
      
      const end = new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      
      const curve = generateBranchCurve(root, end, profile.branching.droop * scale, prng);
      geoms.push(new THREE.TubeGeometry(curve, 12, 0.15 * profile.branching.taper * scale, 6, false));
      
      // Sub branches
      for (let j = 0; j < 3; j++) {
        const t = prng.range(0.3, 0.8);
        const subStart = curve.getPointAt(t);
        const subAngle = angle + prng.range(-1, 1);
        const subRadius = prng.range(1.5, 3) * profile.branching.spread * scale * (1 - t);
        const subHeight = prng.range(-3, 1) * scale * profile.branching.droop;
        
        const subEnd = new THREE.Vector3(
          subStart.x + Math.cos(subAngle) * subRadius,
          subStart.y + subHeight,
          subStart.z + Math.sin(subAngle) * subRadius
        );
        
        const subCurve = generateBranchCurve(subStart, subEnd, profile.branching.droop * scale * 0.5, prng);
        geoms.push(new THREE.TubeGeometry(subCurve, 8, 0.08 * profile.branching.taper * scale, 5, false));
      }
    }
    
    return geoms;
  }, [profile, scale, seedOffset]);

  return (
    <group position={position}>
      {geometries.map((geom, i) => (
        <mesh key={i} geometry={geom} material={material} castShadow />
      ))}
    </group>
  );
}
