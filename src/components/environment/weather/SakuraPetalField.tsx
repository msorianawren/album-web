"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { WindRuntime } from "@/lib/environment/wind";
import { createSeededRandom } from "@/lib/environment/deterministic-random";

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
  const resetRandomRef = useRef(createSeededRandom(`${state.preset}:${state.phase}:petal-resets`));

  const { geometry, colors, physics } = useMemo(() => {
    const prng = createSeededRandom(`${state.preset}:${state.phase}:${petalCount}:${state.foliage.join("|")}`);
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.bezierCurveTo(-0.15, 0.15, -0.15, 0.35, -0.05, 0.45);
    petalShape.bezierCurveTo(-0.02, 0.48, 0, 0.35, 0, 0.35); // Cleft
    petalShape.bezierCurveTo(0, 0.35, 0.02, 0.48, 0.05, 0.45);
    petalShape.bezierCurveTo(0.15, 0.35, 0.15, 0.15, 0, 0);

    const geom = new THREE.ShapeGeometry(petalShape);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setZ(i, y * y * 0.4); // Bend outward
    }
    geom.computeVertexNormals();

    const colorArray = new Float32Array(petalCount * 3);
    const colorOptions = state.foliage.map(c => new THREE.Color(c));
    const physics = [];

    for (let i = 0; i < petalCount; i++) {
      const color = colorOptions[Math.floor(prng.value() * colorOptions.length)].clone();
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      color.setHSL(hsl.h + (prng.value() - 0.5) * 0.05, hsl.s, hsl.l + (prng.value() - 0.5) * 0.1);
      
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;

      physics.push({
        position: new THREE.Vector3(
          (prng.value() - 0.5) * 20,
          prng.value() * 10 + 2,
          (prng.value() - 0.5) * 15 - 2
        ),
        rotation: new THREE.Euler(
          prng.value() * Math.PI,
          prng.value() * Math.PI,
          prng.value() * Math.PI
        ),
        speed: 0.5 + prng.value() * 1.0,
        drift: prng.value() * Math.PI * 2,
        scale: 0.5 + prng.value() * 0.5,
      });
    }

    return { geometry: geom, colors: colorArray, physics };
  }, [petalCount, state.foliage, state.phase, state.preset]);

  useEffect(() => {
    physicsRef.current = physics;
    resetRandomRef.current = createSeededRandom(`${state.preset}:${state.phase}:petal-resets`);
  }, [physics, state.phase, state.preset]);

  useFrame(({ clock }, delta) => {
    if (!active || !meshRef.current) return;
    
    const time = clock.elapsedTime;
    const strength = wind.current.current.strength;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < petalCount; i++) {
      const inst = physicsRef.current[i];
      if (!inst) continue;
      
      // Update position
      inst.position.y -= inst.speed * delta * (1 + strength * 0.2);
      inst.position.x += Math.sin(time + inst.drift) * delta * 0.5 + strength * delta * 2;
      inst.position.z += Math.cos(time * 0.5 + inst.drift) * delta * 0.2;

      // Wrap around
      if (inst.position.y < -5) {
        inst.position.y = 10 + resetRandomRef.current.value() * 5;
        inst.position.x = (resetRandomRef.current.value() - 0.5) * 20;
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
