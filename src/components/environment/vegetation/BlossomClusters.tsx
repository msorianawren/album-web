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

  const { geometry, instances, colors } = useMemo(() => {
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.bezierCurveTo(-0.25, 0.2, -0.25, 0.45, -0.1, 0.55);
    petalShape.bezierCurveTo(-0.05, 0.58, 0, 0.45, 0, 0.45); // Cleft
    petalShape.bezierCurveTo(0, 0.45, 0.05, 0.58, 0.1, 0.55);
    petalShape.bezierCurveTo(0.25, 0.45, 0.25, 0.2, 0, 0);

    const geom = new THREE.ShapeGeometry(petalShape);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setZ(i, y * y * 0.4); // Bend outward
    }
    geom.computeVertexNormals();

    const inst = [];
    const totalPetals = clusterCount * 5;
    const colorArray = new Float32Array(totalPetals * 3);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < clusterCount; i++) {
      const base = clusterPositions[i % clusterPositions.length];
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3
      );
      if (offset.length() > 2) offset.normalize().multiplyScalar(2);

      const flowerCenter = base.clone().add(offset);
      
      const scale = 0.4 + Math.random() * 0.6;

      const baseColor = targetColors[Math.floor(Math.random() * targetColors.length)].clone();
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      baseColor.setHSL(hsl.h + (Math.random() - 0.5) * 0.05, hsl.s, hsl.l + (Math.random() - 0.5) * 0.1);

      const flowerRotation = new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      for (let p = 0; p < 5; p++) {
        dummy.position.copy(flowerCenter);
        dummy.rotation.copy(flowerRotation);
        dummy.rotateZ((p / 5) * Math.PI * 2);
        dummy.rotateX(0.3); // Pitch outward
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        const index = i * 5 + p;
        colorArray[index * 3] = baseColor.r;
        colorArray[index * 3 + 1] = baseColor.g;
        colorArray[index * 3 + 2] = baseColor.b;

        inst.push({
          matrix: dummy.matrix.clone(),
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 1.5
        });
      }
    }

    return { geometry: geom, instances: inst, colors: colorArray };
  }, [clusterCount, targetColors]);

  useFrame(({ clock }) => {
    if (!active || !meshRef.current) return;
    
    const time = clock.elapsedTime;
    const strength = wind.current.current.strength;
    const dummy = new THREE.Object3D();

    const totalPetals = clusterCount * 5;
    for (let i = 0; i < totalPetals; i++) {
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
      args={[geometry, undefined, clusterCount * 5]}
      castShadow={!reduced}
      receiveShadow
    >
      <meshBasicMaterial 
        side={THREE.DoubleSide} 
      />
      <instancedBufferAttribute
        attach="instanceColor"
        args={[colors, 3]}
      />
    </instancedMesh>
  );
}
