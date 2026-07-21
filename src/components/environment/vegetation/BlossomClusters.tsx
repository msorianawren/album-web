"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { WindRuntime } from "@/lib/environment/wind";

// Define locations for blossom clusters along the branches defined in BotanicalTree
const clusterPositions = [
  new THREE.Vector3(2, 6, -1),
  new THREE.Vector3(6, 7, -2),
  new THREE.Vector3(-4, 5, 2),
  new THREE.Vector3(5, 4, -3),
  // Add more scattered positions around the canopy
  new THREE.Vector3(1.5, 6.5, -1.5),
  new THREE.Vector3(5, 7.5, -1),
  new THREE.Vector3(-3.5, 5.5, 1.5),
  new THREE.Vector3(5.5, 4.5, -2),
  new THREE.Vector3(0, 5, 1),
  new THREE.Vector3(-1, 6, 0),
];

export function BlossomClusters({
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
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const targetColors = useMemo(() => state.foliage.map(c => new THREE.Color(c)), [state.foliage]);

  const clusterCount = reduced ? 80 : 300;

  const { geometry, instances } = useMemo(() => {
    // A simple petal/flower geometry - using a low-poly sphere or a custom shape.
    // For performance, an Icosahedron is decent, but intersecting planes (cards) are better for leaves.
    // Given the prompt "không dùng sphere làm hoa", we'll create a simple intersecting plane or small custom shape.
    
    // Creating a 5-petal star-like shape or a simple double-sided plane cluster
    const geom = new THREE.PlaneGeometry(0.5, 0.5);
    geom.translate(0, 0.25, 0); // pivot at base

    const inst = [];
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < clusterCount; i++) {
      // Pick a random base cluster position
      const base = clusterPositions[i % clusterPositions.length];
      
      // Spread them out around the base
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3
      );
      
      // Shape the canopy (ellipsoid)
      if (offset.length() > 2) offset.normalize().multiplyScalar(2);

      const pos = base.clone().add(offset);
      
      dummy.position.copy(pos);
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      const scale = 0.5 + Math.random() * 0.8;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      // Pick a color from the foliage array with slight random variance
      const baseColor = targetColors[Math.floor(Math.random() * targetColors.length)].clone();
      // Add slight HSL variation
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      baseColor.setHSL(hsl.h + (Math.random() - 0.5) * 0.05, hsl.s, hsl.l + (Math.random() - 0.5) * 0.1);

      inst.push({
        matrix: dummy.matrix.clone(),
        color: baseColor,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5
      });
    }

    return { geometry: geom, instances: inst };
  }, [clusterCount, targetColors]);

  useFrame(({ clock }) => {
    if (!active || !meshRef.current) return;
    
    const time = clock.elapsedTime;
    const strength = wind.current.current.strength;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < clusterCount; i++) {
      const inst = instances[i];
      dummy.matrix.copy(inst.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      
      // Wind flutter
      const flutter = Math.sin(time * inst.speed + inst.phase) * strength * 0.1;
      dummy.rotation.x += flutter;
      dummy.rotation.z += flutter * 0.5;
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, clusterCount]}
      castShadow={!reduced}
      receiveShadow
    >
      <meshStandardMaterial 
        side={THREE.DoubleSide} 
        roughness={0.6}
        alphaTest={0.5}
        transparent={false}
        vertexColors={true}
      />
      {instances.map((inst, i) => (
        <instancedBufferAttribute
          key={i}
          attach={`attributes-color`}
          args={[new Float32Array([inst.color.r, inst.color.g, inst.color.b]), 3]}
        />
      ))}
    </instancedMesh>
  );
}
