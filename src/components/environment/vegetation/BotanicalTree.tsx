"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { WindRuntime } from "@/lib/environment/wind";

function generateBranchCurve(start: THREE.Vector3, end: THREE.Vector3, controlOffset: THREE.Vector3) {
  const mid = start.clone().lerp(end, 0.5).add(controlOffset);
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

function createTaperedBranchGeometry(curve: THREE.Curve<THREE.Vector3>, radius: number, segments: number, radialSegments: number) {
  const geom = new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);
  const pos = geom.attributes.position;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Non-linear taper: stays thicker longer, then tapers sharply at end
    const taper = Math.max(0.02, 1 - Math.pow(t, 1.8)); 
    
    for (let j = 0; j <= radialSegments; j++) {
      const vertexIndex = i * (radialSegments + 1) + j;
      if (vertexIndex < pos.count) {
        const curvePoint = curve.getPointAt(t);
        const vx = pos.getX(vertexIndex);
        const vy = pos.getY(vertexIndex);
        const vz = pos.getZ(vertexIndex);
        
        pos.setXYZ(
          vertexIndex,
          curvePoint.x + (vx - curvePoint.x) * taper,
          curvePoint.y + (vy - curvePoint.y) * taper,
          curvePoint.z + (vz - curvePoint.z) * taper
        );
      }
    }
  }
  geom.computeVertexNormals();
  return geom;
}

export function BotanicalTree({
  state,
  active,
  wind,
  reduced,
}: {
  state: EnvironmentState;
  active: boolean;
  wind: React.MutableRefObject<WindRuntime>;
  reduced: boolean;
}) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const trunkGroup = useRef<THREE.Group>(null);
  const branchesGroup = useRef<THREE.Group>(null);

  const targetColor = useMemo(() => new THREE.Color(state.branchColor), [state.branchColor]);

  const trunkGeometry = useMemo(() => {
    const curve = generateBranchCurve(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 6, -1),
      new THREE.Vector3(-1.5, 3, 1)
    );
    return createTaperedBranchGeometry(curve, 0.4, reduced ? 12 : 24, reduced ? 5 : 8);
  }, [reduced]);

  const branchesGeometry = useMemo(() => {
    // Generate some procedural branches
    const geometries: THREE.BufferGeometry[] = [];
    
    // Main branch 1
    const b1 = generateBranchCurve(
      new THREE.Vector3(1, 4, -0.5),
      new THREE.Vector3(6, 7, -2),
      new THREE.Vector3(3, 6, 1)
    );
    geometries.push(createTaperedBranchGeometry(b1, 0.18, reduced ? 8 : 16, reduced ? 4 : 6));

    // Main branch 2
    const b2 = generateBranchCurve(
      new THREE.Vector3(0.5, 3, 0),
      new THREE.Vector3(-4, 5, 2),
      new THREE.Vector3(-2, 4, 3)
    );
    geometries.push(createTaperedBranchGeometry(b2, 0.14, reduced ? 8 : 16, reduced ? 4 : 6));

    // Sub branches
    const b3 = generateBranchCurve(
      new THREE.Vector3(3.5, 5.5, -1),
      new THREE.Vector3(5, 4, -3),
      new THREE.Vector3(4, 5, -2)
    );
    geometries.push(createTaperedBranchGeometry(b3, 0.08, reduced ? 6 : 12, reduced ? 3 : 5));

    // We can merge them if we had BufferGeometryUtils, but for now we'll just return an array 
    // to map over, or since we only have a few, mapping is fine.
    return geometries;
  }, [reduced]);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.color.lerp(targetColor, Math.min(1, delta * 2.2));
    }
    
    if (!active) return;
    
    const strength = wind.current.current.strength;
    if (trunkGroup.current) {
      trunkGroup.current.rotation.z = Math.sin(Date.now() * 0.001) * strength * 0.002;
    }
    if (branchesGroup.current) {
      branchesGroup.current.rotation.z = Math.sin(Date.now() * 0.0015) * strength * 0.01;
      branchesGroup.current.rotation.x = Math.cos(Date.now() * 0.0012) * strength * 0.005;
    }
  });

  return (
    <group>
      <meshStandardMaterial
        ref={materialRef}
        color={state.branchColor}
        emissive={state.branchColor}
        emissiveIntensity={0.15}
        roughness={0.85}
        metalness={0.05}
      />
      <group ref={trunkGroup}>
        <mesh geometry={trunkGeometry} material={materialRef.current || undefined} castShadow={!reduced} receiveShadow />
        <group ref={branchesGroup}>
          {branchesGeometry.map((geom, idx) => (
            <mesh key={idx} geometry={geom} material={materialRef.current || undefined} castShadow={!reduced} receiveShadow />
          ))}
        </group>
      </group>
    </group>
  );
}
