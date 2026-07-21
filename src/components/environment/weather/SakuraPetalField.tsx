"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { WindRuntime } from "@/lib/environment/wind";

export function SakuraPetalField({
  state,
  active,
  wind,
  quality,
}: {
  state: EnvironmentState;
  active: boolean;
  wind: React.MutableRefObject<WindRuntime>;
  quality: EnvironmentQuality;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const petalCount = quality.tier === "reduced" ? 50 : 150;

  const physicsRef = useRef<Array<{
    position: THREE.Vector3;
    rotation: THREE.Euler;
    speed: number;
    drift: number;
    scale: number;
  }>>([]);

  const { geometry, colors } = useMemo(() => {
    // Petal geometry: small bent plane
    const geom = new THREE.PlaneGeometry(0.15, 0.2, 2, 2);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0) pos.setZ(i, 0.05); // Bend top
    }
    geom.computeVertexNormals();

    const colorArray = [];
    const colorOptions = state.foliage.map(c => new THREE.Color(c));
    const physics = [];

    for (let i = 0; i < petalCount; i++) {
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)].clone();
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      color.setHSL(hsl.h + (Math.random() - 0.5) * 0.05, hsl.s, hsl.l + (Math.random() - 0.5) * 0.1);
      colorArray.push(color);

      physics.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          Math.random() * 10 + 2,
          (Math.random() - 0.5) * 15 - 2
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        speed: 0.5 + Math.random() * 1.0,
        drift: Math.random() * Math.PI * 2,
        scale: 0.5 + Math.random() * 0.5,
      });
    }
    
    physicsRef.current = physics;
    
    return { geometry: geom, colors: colorArray };
  }, [petalCount, state.foliage]);

  useFrame(({ clock }, delta) => {
    if (!active || !meshRef.current) return;
    
    const time = clock.elapsedTime;
    const strength = wind.current.current.strength;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < petalCount; i++) {
      const inst = physicsRef.current[i];
      
      // Update position
      inst.position.y -= inst.speed * delta * (1 + strength * 0.2);
      inst.position.x += Math.sin(time + inst.drift) * delta * 0.5 + strength * delta * 2;
      inst.position.z += Math.cos(time * 0.5 + inst.drift) * delta * 0.2;

      // Wrap around
      if (inst.position.y < -5) {
        inst.position.y = 10 + Math.random() * 5;
        inst.position.x = (Math.random() - 0.5) * 20;
      }

      // Update rotation
      inst.rotation.x += delta * inst.speed;
      inst.rotation.y += delta * inst.speed * 0.5;

      dummy.position.copy(inst.position);
      dummy.rotation.copy(inst.rotation);
      dummy.scale.setScalar(inst.scale);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, petalCount]}
      castShadow={false}
      receiveShadow={false}
    >
      <meshStandardMaterial 
        side={THREE.DoubleSide} 
        roughness={0.8}
        alphaTest={0.5}
        vertexColors={true}
      />
      {colors.map((color, i) => (
        <instancedBufferAttribute
          key={i}
          attach={`attributes-color`}
          args={[new Float32Array([color.r, color.g, color.b]), 3]}
        />
      ))}
    </instancedMesh>
  );
}
