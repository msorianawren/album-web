"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useEnvironmentPreferences, useResolvedEnvironmentPhase } from "@/hooks/useEnvironmentPreferences";
import { getEnvironmentState } from "@/lib/environment/presets";

type GearConfig = { position: [number, number, number]; radius: number; teeth: number; speed: number; depth: number };
type ClockworkPointer = { x: number; y: number; energy: number; previousX: number; previousY: number };
type ClockworkPalette = { brass: string; steel: string; dark: string; jewel: string; glow: string };

function buildGears(chapterCount: number): GearConfig[] {
  const count = Math.min(16, Math.max(10, 8 + chapterCount));
  return Array.from({ length: count }, (_, index) => {
    const ring = index < 6 ? 0 : index < 11 ? 1 : 2;
    const ringIndex = ring === 0 ? index : ring === 1 ? index - 6 : index - 11;
    const ringCount = ring === 0 ? 6 : ring === 1 ? 5 : Math.max(1, count - 11);
    const angle = ringIndex / ringCount * Math.PI * 2 + ring * .42;
    const distance = 1.3 + ring * 1.25;
    return {
      position: [Math.cos(angle) * distance, Math.sin(angle) * distance * .68, -ring * .34],
      radius: .38 + ((index * 7) % 5) * .075,
      teeth: 10 + (index % 5) * 2,
      speed: (index % 2 ? -1 : 1) * (2.2 / (10 + (index % 5) * 2)),
      depth: .1 + (index % 3) * .025,
    };
  });
}

function Gear({ config, index, active, reducedMotion, pointerRef, palette }: { 
  config: GearConfig; 
  index: number; 
  active: boolean; 
  reducedMotion: boolean; 
  pointerRef: React.MutableRefObject<ClockworkPointer>; 
  palette: ClockworkPalette; 
}) {
  const group = useRef<THREE.Group>(null);
  const teeth = useRef<THREE.InstancedMesh>(null);
  const spokes = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const node = group.current;
    return () => {
      if (node) {
        node.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
    };
  }, []);

  useEffect(() => {
    if (!teeth.current) return;
    for (let tooth = 0; tooth < config.teeth; tooth += 1) {
      const angle = tooth / config.teeth * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * config.radius, Math.sin(angle) * config.radius, 0);
      dummy.rotation.set(0, 0, angle);
      dummy.scale.set(config.radius * .16, config.radius * .32, config.depth * 1.2);
      dummy.updateMatrix();
      teeth.current.setMatrixAt(tooth, dummy.matrix);
    }
    teeth.current.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    teeth.current.instanceMatrix.needsUpdate = true;
    if (spokes.current) {
      for (let spoke = 0; spoke < 6; spoke += 1) {
        const angle = spoke / 6 * Math.PI * 2;
        dummy.position.set(Math.cos(angle) * config.radius * .36, Math.sin(angle) * config.radius * .36, 0);
        dummy.rotation.set(0, 0, angle);
        dummy.scale.set(config.radius * .62, config.radius * .045, config.depth * .66);
        dummy.updateMatrix();
        spokes.current.setMatrixAt(spoke, dummy.matrix);
      }
      spokes.current.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      spokes.current.instanceMatrix.needsUpdate = true;
    }
  }, [config, dummy]);

  useFrame((_, delta) => {
    if (group.current) {
      if (active && !reducedMotion) {
        group.current.rotation.z += Math.min(delta, .05) * config.speed * (1 + pointerRef.current.energy * 1.8 + (hovered ? 2.5 : 0));
      }
      group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, hovered ? 1.05 : 1, 4, delta));
    }
  });

  const metal = index % 3 === 0 ? palette.brass : index % 3 === 1 ? palette.steel : palette.glow;
  return (
    <group 
      ref={group} 
      position={config.position}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow receiveShadow>
        <torusGeometry args={[config.radius * .72, config.radius * .12, 10, 28]} />
        <meshStandardMaterial color={metal} roughness={.38} metalness={.78} />
      </mesh>
      <instancedMesh ref={teeth} args={[undefined, undefined, config.teeth]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={metal} roughness={.42} metalness={.72} />
      </instancedMesh>
      <instancedMesh ref={spokes} args={[undefined, undefined, 6]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={metal} roughness={.38} metalness={.76} />
      </instancedMesh>
      <mesh position={[0, 0, .04]} castShadow>
        <cylinderGeometry args={[config.radius * .14, config.radius * .14, config.depth * 2.2, 14]} />
        <meshStandardMaterial color={palette.dark} roughness={.48} metalness={.58} />
      </mesh>
      <mesh position={[0, 0, config.depth * 1.35]}>
        <sphereGeometry args={[config.radius * .065, 12, 8]} />
        <meshStandardMaterial color={palette.jewel} roughness={.18} metalness={.22} emissive={palette.jewel} emissiveIntensity={.12} />
      </mesh>
    </group>
  );
}

function ClockworkScene({ chapterCount, active, reducedMotion, pointerRef, palette }: {
  chapterCount: number;
  active: boolean;
  reducedMotion: boolean;
  pointerRef: React.MutableRefObject<ClockworkPointer>;
  palette: ClockworkPalette;
}) {
  const assembly = useRef<THREE.Group>(null);
  const pendulum = useRef<THREE.Group>(null);
  const minuteHand = useRef<THREE.Group>(null);
  const hourHand = useRef<THREE.Group>(null);
  const balance = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const gears = useMemo(() => buildGears(chapterCount), [chapterCount]);
  const scale = Math.min(1, viewport.width / 8.4);

  useEffect(() => {
    const node = assembly.current;
    return () => {
      if (node) {
        node.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
    };
  }, []);

  useFrame(({ clock }, delta) => {
    if (!assembly.current) return;
    assembly.current.rotation.x = THREE.MathUtils.damp(assembly.current.rotation.x, pointerRef.current.y * .085, 4, delta);
    assembly.current.rotation.y = THREE.MathUtils.damp(assembly.current.rotation.y, pointerRef.current.x * .11, 4, delta);
    pointerRef.current.energy = THREE.MathUtils.damp(pointerRef.current.energy, 0, 3.2, Math.min(delta, .05));
    if (active && !reducedMotion) {
      const speed = 1 + pointerRef.current.energy * 1.5;
      if (pendulum.current) pendulum.current.rotation.z = Math.sin(clock.elapsedTime * 1.45 * speed) * .19;
      if (minuteHand.current) minuteHand.current.rotation.z = -clock.elapsedTime * .045 * speed;
      if (hourHand.current) hourHand.current.rotation.z = -clock.elapsedTime * .012 * speed;
      if (balance.current) balance.current.rotation.z = Math.sin(clock.elapsedTime * 3.8 * speed) * .34;
    }
  });

  return (
    <group ref={assembly} position={[viewport.width > 7 ? 1.45 : .35, -.1, 0]} scale={scale * (viewport.width > 7 ? .9 : .78)} rotation={[.04, -.08, 0]}>
      <mesh position={[0, 0, -.7]}>
        <circleGeometry args={[4.7, 64]} />
        <meshStandardMaterial color="#bfae9a" transparent opacity={.08} roughness={1} depthWrite={false} />
      </mesh>
      {gears.map((gear, index) => <Gear key={index} config={gear} index={index} active={active} reducedMotion={reducedMotion} pointerRef={pointerRef} palette={palette} />)}
      <group position={[0, 0, .36]}>
        {[0, 1, 2].map((index) => <mesh key={index} position={[0, 0, index * .035]}>
          <ringGeometry args={[3.55 + index * .18, 3.58 + index * .18, 96]} />
          <meshStandardMaterial color={index === 1 ? palette.steel : palette.brass} metalness={.76} roughness={.34} transparent opacity={.48 - index * .08} />
        </mesh>)}
        <group ref={minuteHand}>
          <mesh position={[0, 1.45, .15]}>
            <boxGeometry args={[.055, 2.9, .045]} />
            <meshStandardMaterial color={palette.steel} metalness={.82} roughness={.26} />
          </mesh>
        </group>
        <group ref={hourHand}>
          <mesh position={[0, .96, .19]}>
            <boxGeometry args={[.085, 1.92, .055]} />
            <meshStandardMaterial color={palette.dark} metalness={.7} roughness={.3} />
          </mesh>
        </group>
        <mesh position={[0, 0, .24]}>
          <sphereGeometry args={[.14, 18, 12]} />
          <meshStandardMaterial color={palette.jewel} metalness={.26} roughness={.16} emissive={palette.jewel} emissiveIntensity={.16} />
        </mesh>
      </group>
      <group ref={balance} position={[-2.35, -1.72, .42]}>
        <mesh>
          <torusGeometry args={[.72, .055, 10, 48]} />
          <meshStandardMaterial color={palette.brass} metalness={.82} roughness={.28} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[1.25, .045, .05]} />
          <meshStandardMaterial color={palette.steel} metalness={.74} roughness={.3} />
        </mesh>
      </group>
      <mesh position={[2.55, -1.7, .12]} rotation={[0, 0, -.35]}>
        <boxGeometry args={[2.15, .16, .13]} />
        <meshStandardMaterial color={palette.steel} metalness={.68} roughness={.38} />
      </mesh>
      <group ref={pendulum} position={[0, .15, -.25]}>
        <mesh position={[0, -2.25, 0]} castShadow>
          <boxGeometry args={[.055, 4.5, .06]} />
          <meshStandardMaterial color={palette.brass} metalness={.82} roughness={.3} />
        </mesh>
        <mesh position={[0, -4.45, 0]} castShadow>
          <sphereGeometry args={[.34, 24, 18]} />
          <meshStandardMaterial color={palette.glow} metalness={.84} roughness={.24} />
        </mesh>
      </group>
      <mesh position={[0, 0, .5]}>
        <ringGeometry args={[3.85, 3.89, 96]} />
        <meshStandardMaterial color={palette.glow} metalness={.7} roughness={.32} transparent opacity={.62} />
      </mesh>
    </group>
  );
}

export function AboutClockwork({ displayName, chapterCount }: { displayName: string; chapterCount: number }) {
  const container = useRef<HTMLDivElement>(null);
  const pointer = useRef<ClockworkPointer>({ x: 0, y: 0, energy: 0, previousX: 0, previousY: 0 });
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { preferences } = useEnvironmentPreferences();
  const phase = useResolvedEnvironmentPhase(preferences.phase);
  const environment = getEnvironmentState(preferences.preset === "default" ? "sakura" : preferences.preset, phase);
  const palette = useMemo<ClockworkPalette>(() => ({
    brass: environment.keyLight,
    steel: environment.fillLight,
    dark: environment.branchColor,
    jewel: environment.particle[0],
    glow: environment.particle[1] ?? environment.keyLight,
  }), [environment]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    updateMotion();
    motion.addEventListener("change", updateMotion);

    const handlePointerMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      pointer.current.energy = Math.min(1, pointer.current.energy + Math.hypot(x - pointer.current.previousX, y - pointer.current.previousY) * 2.6);
      pointer.current.previousX = x;
      pointer.current.previousY = y;
      pointer.current.x = x;
      pointer.current.y = y;
    };

    const handlePointerLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
      pointer.current.energy = 0;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => { 
      motion.removeEventListener("change", updateMotion); 
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div ref={container} className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen" aria-hidden="true">
      <Canvas frameloop={visible && !reducedMotion ? "always" : "demand"} dpr={[1, 1.5]} camera={{ position: [0, 0, 9.5], fov: 40 }} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}>
        <ambientLight intensity={.72} color={palette.glow} />
        <directionalLight position={[3, 5, 6]} intensity={1.7} color={palette.brass} castShadow />
        <directionalLight position={[-4, -1, 3]} intensity={.55} color={palette.steel} />
        <ClockworkScene chapterCount={chapterCount} active={visible} reducedMotion={reducedMotion} pointerRef={pointer} palette={palette} />
      </Canvas>
    </div>
  );
}

