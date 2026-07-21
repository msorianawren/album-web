import * as THREE from "three";
import { useMemo } from "react";
import type { BotanicalArchetype } from "@/lib/environment/botanical-profiles";
import { createSeededRandom } from "@/lib/environment/deterministic-random";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";

function generateBranchCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  droop: number,
  upwardBias: number,
  prng: ReturnType<typeof createSeededRandom>
) {
  const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
  mid.y += upwardBias * prng.range(0.3, 0.8);
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
  preferences,
}: {
  profile: BotanicalArchetype;
  position: [number, number, number];
  scale?: number;
  seedOffset: number;
  preferences: EnvironmentPreferences;
}) {
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: profile.branching.trunkColor,
    roughness: profile.branching.roughness,
    metalness: 0.0,
  }), [profile.branching.trunkColor, profile.branching.roughness]);

  const geometries = useMemo(() => {
    const prng = createSeededRandom(profile.seed + seedOffset);
    const geoms: THREE.TubeGeometry[] = [];
    const upBias = profile.branching.upwardBias ?? 0;
    
    // Optional Cedar-specific trunk extensions
    const trunkHeight = (profile.branching.trunkHeight ?? 0) * scale * 3.0; // scale up to world units
    const originH = (profile.branching.branchOriginHeight ?? 0) * trunkHeight;
    const trunkRadius = (profile.branching.trunkRadius ?? 0) * scale;
    
    // Draw main trunk if requested
    if (trunkHeight > 0 && trunkRadius > 0) {
      const trunkStart = new THREE.Vector3(0, 0, 0);
      const trunkEnd = new THREE.Vector3(0, trunkHeight, 0);
      // Slight lean/bend for natural trunk
      const leanX = (prng.value() - 0.5) * trunkHeight * 0.1;
      const leanZ = (prng.value() - 0.5) * trunkHeight * 0.1;
      trunkEnd.x += leanX;
      trunkEnd.z += leanZ;
      const trunkCurve = new THREE.QuadraticBezierCurve3(
        trunkStart,
        new THREE.Vector3(leanX * 0.5, trunkHeight * 0.5, leanZ * 0.5),
        trunkEnd
      );
      geoms.push(new THREE.TubeGeometry(trunkCurve, 12, trunkRadius, 8, false));
    }

    for (let i = 0; i < profile.branching.segments; i++) {
      // Determine origin point for this branch along the trunk
      const branchT = trunkHeight > 0 ? prng.range(originH / trunkHeight, 1.0) : 0;
      const rootY = trunkHeight * branchT;
      const root = new THREE.Vector3(0, rootY, 0);

      const angle = prng.range(0, Math.PI * 2);
      const radius = prng.range(3, 6) * profile.branching.spread * scale;
      const height = prng.range(-1, 3) * scale * (1 + upBias * 0.5);

      const end = new THREE.Vector3(
        root.x + Math.cos(angle) * radius,
        root.y + height,
        root.z + Math.sin(angle) * radius
      );

      const curve = generateBranchCurve(root, end, profile.branching.droop * scale, upBias * scale, prng);
      geoms.push(new THREE.TubeGeometry(curve, 12, 0.15 * profile.branching.taper * scale, 6, false));

      // Sub-branches
      for (let j = 0; j < 3; j++) {
        const t = prng.range(0.3, 0.8);
        const subStart = curve.getPointAt(t);
        const subAngle = angle + prng.range(-1, 1);
        const subRadius = prng.range(1.5, 3) * profile.branching.spread * scale * (1 - t);
        const subHeight = prng.range(-2, 2) * scale * (1 + upBias * 0.3) - profile.branching.droop * scale * 0.3;

        const subEnd = new THREE.Vector3(
          subStart.x + Math.cos(subAngle) * subRadius,
          subStart.y + subHeight,
          subStart.z + Math.sin(subAngle) * subRadius
        );

        const subCurve = generateBranchCurve(subStart, subEnd, profile.branching.droop * scale * 0.5, upBias * scale * 0.5, prng);
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
