"use client";

import "@/lib/three-compat";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { EnvironmentState } from "@/lib/environment/presets";

/* ── types ────────────────────────────────────────────────── */

type CameraPalette = {
  wood: string;
  darkWood: string;
  brass: string;
  steel: string;
  lens: string;
  glow: string;
  jewel: string;
};

type Pointer = {
  x: number;
  y: number;
  energy: number;
  prevX: number;
  prevY: number;
};

type GearCfg = {
  pos: [number, number, number];
  r: number;
  teeth: number;
  speed: number;
  depth: number;
  type?: "standard" | "spoked" | "sun" | "ratchet" | "bevel";
};

type ActiveFilmStrip = {
  active: boolean;
  born: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  scale: number;
};

/* ── helpers ──────────────────────────────────────────────── */

const SHUTTER_EVENT = "album-camera-shutter";

function darken(hex: string, f: number): string {
  const c = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.floor(((c >> 16) & 0xff) * f));
  const g = Math.max(0, Math.floor(((c >> 8) & 0xff) * f));
  const b = Math.max(0, Math.floor((c & 0xff) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ── optimized shared singleton vintage shutter audio ────── */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playVintageShutterSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Initial mechanical shutter click (crisp snap)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(130, now + 0.035);
    gain1.gain.setValueAtTime(0.24, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.04);

    // 2. Curtain slide / gear whir burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.07);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 2100;
    noiseFilter.Q.value = 3.0;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.1, now + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now + 0.006);

    // 3. Mirror return snap
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(540, now + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(180, now + 0.14);
    gain2.gain.setValueAtTime(0.14, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.19);

    // 4. Fairy-tale chime shimmer (warm harmonic)
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = "sine";
    chimeOsc.frequency.setValueAtTime(1174.66, now + 0.03);
    chimeGain.gain.setValueAtTime(0.05, now + 0.03);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    chimeOsc.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chimeOsc.start(now + 0.03);
    chimeOsc.stop(now + 0.55);
  } catch {
    // Audio context may be restricted by browser until interaction
  }
}

/* ── gear train layouts ───────────────────────────────────── */

function buildInternalGears(): GearCfg[] {
  return [
    // Left Cluster (Drive barrel & main power train)
    { pos: [-1.22, 0.32, -0.1], r: 0.38, teeth: 18, speed: 0.14, depth: 0.07, type: "spoked" },
    { pos: [-0.92, -0.22, -0.16], r: 0.28, teeth: 14, speed: -0.2, depth: 0.06, type: "spoked" },
    { pos: [-1.35, -0.42, -0.06], r: 0.22, teeth: 10, speed: 0.28, depth: 0.05, type: "spoked" },
    { pos: [-0.72, 0.52, -0.2], r: 0.18, teeth: 8, speed: -0.34, depth: 0.04, type: "standard" },
    { pos: [-1.45, 0.12, -0.22], r: 0.26, teeth: 12, speed: -0.16, depth: 0.05, type: "spoked" },

    // Center-Bottom (Shutter governor & delay timing train)
    { pos: [0.0, -0.48, -0.24], r: 0.3, teeth: 16, speed: 0.12, depth: 0.06, type: "spoked" },
    { pos: [0.32, -0.68, -0.18], r: 0.2, teeth: 10, speed: -0.24, depth: 0.045, type: "standard" },
    { pos: [-0.28, -0.72, -0.12], r: 0.16, teeth: 8, speed: 0.32, depth: 0.04, type: "standard" },
    { pos: [-0.55, -0.62, -0.26], r: 0.22, teeth: 10, speed: -0.22, depth: 0.05, type: "spoked" },

    // Right Cluster (Film transport & Geneva indexing)
    { pos: [0.98, 0.2, -0.14], r: 0.28, teeth: 14, speed: -0.18, depth: 0.055, type: "spoked" },
    { pos: [1.22, -0.28, -0.08], r: 0.34, teeth: 16, speed: 0.14, depth: 0.065, type: "spoked" },
    { pos: [1.38, 0.46, -0.22], r: 0.18, teeth: 8, speed: -0.28, depth: 0.04, type: "standard" },
    { pos: [0.72, -0.35, -0.2], r: 0.22, teeth: 10, speed: 0.25, depth: 0.045, type: "standard" },
    { pos: [1.45, -0.58, -0.18], r: 0.19, teeth: 8, speed: -0.3, depth: 0.04, type: "standard" },

    // Deep Background Skeleton Gears
    { pos: [-0.52, 0.15, -0.38], r: 0.42, teeth: 20, speed: 0.08, depth: 0.08, type: "spoked" },
    { pos: [0.65, -0.12, -0.4], r: 0.36, teeth: 18, speed: -0.1, depth: 0.07, type: "spoked" },
    { pos: [0.1, 0.58, -0.36], r: 0.24, teeth: 12, speed: 0.16, depth: 0.05, type: "standard" },
    { pos: [-1.08, 0.65, -0.32], r: 0.2, teeth: 10, speed: 0.22, depth: 0.04, type: "standard" },
  ];
}

/* ── single gear with instanced teeth and spokes ──────────── */

function Gear({
  cfg,
  idx,
  active,
  reducedMotion,
  pointerRef,
  palette,
  shutterBoost,
}: {
  cfg: GearCfg;
  idx: number;
  active: boolean;
  reducedMotion: boolean;
  pointerRef: React.RefObject<Pointer>;
  palette: CameraPalette;
  shutterBoost: React.RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const teeth = useRef<THREE.InstancedMesh>(null);
  const spokes = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!teeth.current) return;
    for (let t = 0; t < cfg.teeth; t++) {
      const a = (t / cfg.teeth) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * cfg.r, Math.sin(a) * cfg.r, 0);
      dummy.rotation.set(0, 0, a);
      dummy.scale.set(cfg.r * 0.14, cfg.r * 0.28, cfg.depth * 1.15);
      dummy.updateMatrix();
      teeth.current.setMatrixAt(t, dummy.matrix);
    }
    teeth.current.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    teeth.current.instanceMatrix.needsUpdate = true;

    if (spokes.current) {
      const spokeCount = Math.min(6, Math.max(3, Math.floor(cfg.teeth / 3)));
      for (let s = 0; s < spokeCount; s++) {
        const a = (s / spokeCount) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * cfg.r * 0.38, Math.sin(a) * cfg.r * 0.38, 0);
        dummy.rotation.set(0, 0, a);
        dummy.scale.set(cfg.r * 0.62, cfg.r * 0.04, cfg.depth * 0.6);
        dummy.updateMatrix();
        spokes.current.setMatrixAt(s, dummy.matrix);
      }
      spokes.current.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      spokes.current.instanceMatrix.needsUpdate = true;
    }
  }, [cfg, dummy]);

  useEffect(() => {
    const node = group.current;
    return () => {
      if (node) {
        node.traverse((c) => {
          if (c instanceof THREE.Mesh || c instanceof THREE.InstancedMesh) {
            c.geometry?.dispose();
            const mat = c.material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat?.dispose();
          }
        });
      }
    };
  }, []);

  useFrame((_, delta) => {
    if (!group.current || !active || reducedMotion) return;
    const boost = 1 + (pointerRef.current?.energy ?? 0) * 1.6 + (shutterBoost.current ?? 0) * 6.5;
    group.current.rotation.z += Math.min(delta, 0.05) * cfg.speed * boost;
  });

  const spokeCount = Math.min(6, Math.max(3, Math.floor(cfg.teeth / 3)));
  const metal = idx % 3 === 0 ? palette.brass : idx % 3 === 1 ? palette.steel : palette.glow;

  return (
    <group ref={group} position={cfg.pos}>
      <mesh>
        <torusGeometry args={[cfg.r * 0.72, cfg.r * 0.1, 8, 24]} />
        <meshStandardMaterial color={metal} roughness={0.34} metalness={0.8} />
      </mesh>
      <instancedMesh ref={teeth} args={[undefined, undefined, cfg.teeth]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={metal} roughness={0.38} metalness={0.76} />
      </instancedMesh>
      <instancedMesh ref={spokes} args={[undefined, undefined, spokeCount]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={metal} roughness={0.34} metalness={0.78} />
      </instancedMesh>
      <mesh position={[0, 0, 0.02]}>
        <cylinderGeometry args={[cfg.r * 0.14, cfg.r * 0.14, cfg.depth * 2, 14]} />
        <meshStandardMaterial color={palette.darkWood} roughness={0.44} metalness={0.58} />
      </mesh>
      <mesh position={[0, 0, cfg.depth * 1.18]}>
        <sphereGeometry args={[cfg.r * 0.07, 10, 8]} />
        <meshStandardMaterial
          color={palette.jewel}
          roughness={0.12}
          metalness={0.25}
          emissive={palette.jewel}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

/* ── Swiss Lever Escapement & Balance Wheel Mechanism ─────── */

function HorologicalEscapement({
  position,
  active,
  reducedMotion,
  palette,
  shutterBoost,
}: {
  position: [number, number, number];
  active: boolean;
  reducedMotion: boolean;
  palette: CameraPalette;
  shutterBoost: React.RefObject<number>;
}) {
  const balanceWheel = useRef<THREE.Group>(null);
  const hairspring = useRef<THREE.Mesh>(null);
  const palletFork = useRef<THREE.Group>(null);
  const escapeWheel = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!active || reducedMotion) return;
    const nowSec = performance.now() * 0.001;
    const freq = 4.8 + (shutterBoost.current ?? 0) * 10.0;

    const balanceAngle = Math.sin(nowSec * freq) * 0.95;
    if (balanceWheel.current) {
      balanceWheel.current.rotation.z = balanceAngle;
    }
    if (hairspring.current) {
      const breathe = 1 + Math.sin(nowSec * freq) * 0.12;
      hairspring.current.scale.set(breathe, breathe, 1);
    }
    if (palletFork.current) {
      palletFork.current.rotation.z = Math.sin(nowSec * freq) > 0 ? 0.18 : -0.18;
    }
    if (escapeWheel.current) {
      escapeWheel.current.rotation.z += delta * (0.8 + (shutterBoost.current ?? 0) * 5.5);
    }
  });

  return (
    <group position={position}>
      <group ref={balanceWheel} position={[0, 0.28, 0]}>
        <mesh>
          <torusGeometry args={[0.26, 0.018, 8, 36]} />
          <meshStandardMaterial color={palette.brass} roughness={0.24} metalness={0.88} />
        </mesh>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, i) => (
          <mesh key={`spoke-${i}`} rotation={[0, 0, angle]}>
            <boxGeometry args={[0.5, 0.02, 0.015]} />
            <meshStandardMaterial color={palette.steel} roughness={0.3} metalness={0.82} />
          </mesh>
        ))}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh key={`screw-${i}`} position={[Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.025, 8]} />
              <meshStandardMaterial color={palette.brass} roughness={0.2} metalness={0.9} />
            </mesh>
          );
        })}
        <mesh position={[0, 0, 0.02]}>
          <cylinderGeometry args={[0.04, 0.04, 0.04, 12]} />
          <meshStandardMaterial color={palette.steel} roughness={0.25} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <sphereGeometry args={[0.022, 10, 8]} />
          <meshStandardMaterial color={palette.jewel} emissive={palette.jewel} emissiveIntensity={0.5} />
        </mesh>
      </group>

      <mesh ref={hairspring} position={[0, 0.28, -0.03]}>
        <torusGeometry args={[0.16, 0.008, 6, 48, Math.PI * 6]} />
        <meshStandardMaterial color="#4f86f7" roughness={0.2} metalness={0.9} />
      </mesh>

      <group ref={palletFork} position={[0, 0.06, -0.02]}>
        <mesh>
          <boxGeometry args={[0.04, 0.16, 0.018]} />
          <meshStandardMaterial color={palette.steel} roughness={0.28} metalness={0.85} />
        </mesh>
        {[-0.045, 0.045].map((x, i) => (
          <mesh key={`jewel-${i}`} position={[x, -0.06, 0]}>
            <boxGeometry args={[0.022, 0.035, 0.015]} />
            <meshStandardMaterial color={palette.jewel} emissive={palette.jewel} emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>

      <group ref={escapeWheel} position={[0, -0.16, -0.04]}>
        <mesh>
          <torusGeometry args={[0.18, 0.012, 6, 24]} />
          <meshStandardMaterial color={palette.brass} roughness={0.28} metalness={0.85} />
        </mesh>
        {Array.from({ length: 15 }).map((_, i) => {
          const a = (i / 15) * Math.PI * 2;
          return (
            <mesh key={`tooth-${i}`} position={[Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0]} rotation={[0, 0, a + 0.4]}>
              <boxGeometry args={[0.02, 0.055, 0.015]} />
              <meshStandardMaterial color={palette.brass} roughness={0.25} metalness={0.85} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* ── Planetary Differential Gearbox ───────────────────────── */

function PlanetaryGearbox({
  position,
  active,
  reducedMotion,
  palette,
  shutterBoost,
}: {
  position: [number, number, number];
  active: boolean;
  reducedMotion: boolean;
  palette: CameraPalette;
  shutterBoost: React.RefObject<number>;
}) {
  const carrier = useRef<THREE.Group>(null);
  const sunGear = useRef<THREE.Mesh>(null);
  const ringGear = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!active || reducedMotion) return;
    const speed = (0.2 + (shutterBoost.current ?? 0) * 2.2) * delta;
    if (carrier.current) carrier.current.rotation.z += speed * 0.6;
    if (sunGear.current) sunGear.current.rotation.z -= speed * 1.8;
    if (ringGear.current) ringGear.current.rotation.z += speed * 0.2;
  });

  return (
    <group position={position}>
      <mesh ref={ringGear}>
        <torusGeometry args={[0.38, 0.025, 8, 36]} />
        <meshStandardMaterial color={palette.steel} roughness={0.3} metalness={0.82} />
      </mesh>
      <mesh ref={sunGear}>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
        <meshStandardMaterial color={palette.brass} roughness={0.32} metalness={0.85} />
      </mesh>
      <group ref={carrier}>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a, i) => {
          const px = Math.cos(a) * 0.24;
          const py = Math.sin(a) * 0.24;
          return (
            <group key={`planet-${i}`} position={[px, py, 0]}>
              <mesh>
                <cylinderGeometry args={[0.1, 0.1, 0.035, 14]} />
                <meshStandardMaterial color={palette.glow} roughness={0.3} metalness={0.78} />
              </mesh>
              <mesh position={[0, 0, 0.025]}>
                <sphereGeometry args={[0.018, 8, 6]} />
                <meshStandardMaterial color={palette.jewel} emissive={palette.jewel} emissiveIntensity={0.4} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, 0, 0.03]}>
          <ringGeometry args={[0.06, 0.26, 3]} />
          <meshStandardMaterial color={palette.brass} roughness={0.35} metalness={0.75} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Centrifugal Flyball Governor ─────────────────────────── */

function CentrifugalGovernor({
  position,
  active,
  reducedMotion,
  palette,
  shutterBoost,
}: {
  position: [number, number, number];
  active: boolean;
  reducedMotion: boolean;
  palette: CameraPalette;
  shutterBoost: React.RefObject<number>;
}) {
  const spindle = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const collar = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!active || reducedMotion) return;
    const spinSpeed = 1.8 + (shutterBoost.current ?? 0) * 12.0;
    if (spindle.current) spindle.current.rotation.y += delta * spinSpeed;

    const liftAngle = THREE.MathUtils.lerp(0.32, 0.88, (shutterBoost.current ?? 0));
    if (armL.current) armL.current.rotation.z = -liftAngle;
    if (armR.current) armR.current.rotation.z = liftAngle;
    if (collar.current) collar.current.position.y = -0.05 + liftAngle * 0.12;
  });

  return (
    <group ref={spindle} position={position}>
      <mesh>
        <cylinderGeometry args={[0.016, 0.016, 0.42, 12]} />
        <meshStandardMaterial color={palette.steel} roughness={0.25} metalness={0.85} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshStandardMaterial color={palette.brass} roughness={0.28} metalness={0.88} />
      </mesh>
      <mesh ref={collar} position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.04, 12]} />
        <meshStandardMaterial color={palette.brass} roughness={0.26} metalness={0.86} />
      </mesh>
      <group ref={armL} position={[-0.015, 0.16, 0]}>
        <mesh position={[-0.08, -0.08, 0]} rotation={[0, 0, 0.8]}>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
          <meshStandardMaterial color={palette.steel} roughness={0.28} metalness={0.8} />
        </mesh>
        <mesh position={[-0.14, -0.14, 0]}>
          <sphereGeometry args={[0.042, 14, 10]} />
          <meshStandardMaterial color={palette.brass} roughness={0.2} metalness={0.9} />
        </mesh>
      </group>
      <group ref={armR} position={[0.015, 0.16, 0]}>
        <mesh position={[0.08, -0.08, 0]} rotation={[0, 0, -0.8]}>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
          <meshStandardMaterial color={palette.steel} roughness={0.28} metalness={0.8} />
        </mesh>
        <mesh position={[0.14, -0.14, 0]}>
          <sphereGeometry args={[0.042, 14, 10]} />
          <meshStandardMaterial color={palette.brass} roughness={0.2} metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Miniature Steampunk Gauge Dial ───────────────────────── */

function GaugeDial({
  position,
  palette,
  shutterBoost,
}: {
  position: [number, number, number];
  palette: CameraPalette;
  shutterBoost: React.RefObject<number>;
}) {
  const needle = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!needle.current) return;
    const boost = shutterBoost.current ?? 0;
    const targetAngle = -0.4 + boost * 1.6;
    needle.current.rotation.z = THREE.MathUtils.lerp(needle.current.rotation.z, targetAngle, 0.25);
  });

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.18, 0.18, 0.03, 24]} />
        <meshStandardMaterial color={palette.brass} roughness={0.28} metalness={0.82} />
      </mesh>
      <mesh position={[0, 0, 0.016]}>
        <circleGeometry args={[0.15, 24]} />
        <meshStandardMaterial color="#fffbf0" roughness={0.4} metalness={0.1} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => {
        const a = -Math.PI * 0.7 + (i / 8) * Math.PI * 1.4;
        return (
          <mesh key={`tick-${i}`} position={[Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.02]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.006, 0.03, 0.005]} />
            <meshStandardMaterial color="#332211" roughness={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, 0, 0.024]}>
        <cylinderGeometry args={[0.02, 0.02, 0.015, 10]} />
        <meshStandardMaterial color={palette.darkWood} roughness={0.5} />
      </mesh>
      <mesh ref={needle} position={[0, 0, 0.026]}>
        <boxGeometry args={[0.008, 0.1, 0.004]} />
        <meshStandardMaterial color="#b3261e" roughness={0.3} emissive="#b3261e" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.032]}>
        <circleGeometry args={[0.155, 24]} />
        <meshStandardMaterial color={palette.lens} roughness={0.05} metalness={0.5} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/* ── In-Chassis Physical Film Tape Reel with Photo Frames ─── */

function InChassisFilmTape({
  palette,
  shutterBoost,
  active,
  reducedMotion,
}: {
  palette: CameraPalette;
  shutterBoost: React.RefObject<number>;
  active: boolean;
  reducedMotion: boolean;
}) {
  const filmStrip = useRef<THREE.Group>(null);
  const spoolL = useRef<THREE.Group>(null);
  const spoolR = useRef<THREE.Group>(null);
  const filmOffset = useRef(0);

  useFrame((_, delta) => {
    if (!active || reducedMotion) return;
    const boost = shutterBoost.current ?? 0;

    // ONLY advance film and rotate spools when flash button is pressed! Zero motion in idle!
    if (boost > 0.001) {
      const advanceSpeed = boost * 3.6 * delta;
      filmOffset.current += advanceSpeed;

      if (filmStrip.current) {
        // Seamless 0.6 pitch modulo creates completely continuous, smooth frame movement
        filmStrip.current.position.x = ((filmOffset.current % 0.6) - 0.3);
      }
      if (spoolL.current) spoolL.current.rotation.y += advanceSpeed * 2.4;
      if (spoolR.current) spoolR.current.rotation.y += advanceSpeed * 2.4;
    }
  });

  return (
    <group position={[0, 0, -0.32]}>
      {/* Supply Spool (Left) */}
      <group ref={spoolL} position={[-1.25, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.72, 20]} />
          <meshStandardMaterial color="#1a120c" roughness={0.55} metalness={0.15} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={`spool-flange-l-${s}`} position={[0, s * 0.38, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.025, 24]} />
            <meshStandardMaterial color={palette.brass} roughness={0.24} metalness={0.85} />
          </mesh>
        ))}
      </group>

      {/* Take-up Spool (Right) */}
      <group ref={spoolR} position={[1.25, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.24, 0.24, 0.72, 20]} />
          <meshStandardMaterial color="#1a120c" roughness={0.55} metalness={0.15} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={`spool-flange-r-${s}`} position={[0, s * 0.38, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.025, 24]} />
            <meshStandardMaterial color={palette.brass} roughness={0.24} metalness={0.85} />
          </mesh>
        ))}
      </group>

      {/* Exposed Moving Translucent Film Tape Carrier */}
      <group ref={filmStrip} position={[0, 0, -0.02]}>
        <mesh>
          <planeGeometry args={[3.6, 0.65]} />
          <meshStandardMaterial
            color="#2a180e"
            roughness={0.4}
            metalness={0.2}
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 6 Seamlessly Spaced Negative Frames at exact 0.6 pitch */}
        {[-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((fx, i) => (
          <group key={`frame-${i}`} position={[fx, 0, 0.005]}>
            <mesh>
              <ringGeometry args={[0.22, 0.25, 4]} />
              <meshStandardMaterial color={palette.brass} roughness={0.25} metalness={0.85} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <planeGeometry args={[0.42, 0.38]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#ffeedd" : "#ffd28c"}
                roughness={0.3}
                metalness={0.1}
                transparent
                opacity={0.35}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}

        {/* Sprocket Holes at matching 0.6 sub-multiples (0.15 pitch) */}
        {[-0.28, 0.28].map((py, j) => (
          <group key={`track-${j}`} position={[0, py, 0.006]}>
            {Array.from({ length: 24 }).map((_, k) => (
              <mesh key={`sprocket-${k}`} position={[-1.725 + k * 0.15, 0, 0]}>
                <planeGeometry args={[0.065, 0.045]} />
                <meshStandardMaterial color="#000000" roughness={0.8} transparent opacity={0.7} side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

/* ── Pre-Allocated Flying Film Strips Pool (Zero Re-renders) ── */

const POOL_SIZE = 16;

function FlyingFilmStripsPool({ palette }: { palette: CameraPalette }) {
  const meshRefs = useRef<(THREE.Group | null)[]>([]);
  const pool = useRef<ActiveFilmStrip[]>([]);
  const poolIndex = useRef(0);

  useEffect(() => {
    pool.current = Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      born: 0,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      vrx: 0,
      vry: 0,
      vrz: 0,
      scale: 1,
    }));

    const onShutter = () => {
      const idx = poolIndex.current % POOL_SIZE;
      poolIndex.current++;
      const item = pool.current[idx];
      if (!item) return;

      item.active = true;
      item.born = performance.now() * 0.001;

      // Eject from BEHIND the camera chassis (rear film gate)
      item.x = -0.7 + (Math.random() - 0.5) * 0.25;
      item.y = 0.35 + (Math.random() - 0.5) * 0.15;
      item.z = -0.85; // Behind the camera!

      // Arc left-to-right, leaping up over the camera and swooping forward
      item.vx = 2.8 + Math.random() * 1.3; // left to right
      item.vy = 1.7 + Math.random() * 0.8; // upward arc
      item.vz = 1.1 + Math.random() * 0.6; // swoops forward from behind
      item.rx = -0.3 + (Math.random() - 0.5) * 0.4;
      item.ry = 0.4 + (Math.random() - 0.5) * 0.4;
      item.rz = -0.35 + (Math.random() - 0.5) * 0.3;
      item.vrx = 1.2 + Math.random() * 1.4;
      item.vry = 0.9 + Math.random() * 1.2;
      item.vrz = -0.7 - Math.random() * 0.9;
      item.scale = 0.85 + Math.random() * 0.25;
    };

    window.addEventListener(SHUTTER_EVENT, onShutter);
    return () => window.removeEventListener(SHUTTER_EVENT, onShutter);
  }, []);

  useFrame((_, delta) => {
    const nowSec = performance.now() * 0.001;
    const lifetime = 2.8;

    for (let i = 0; i < POOL_SIZE; i++) {
      const item = pool.current[i];
      const grp = meshRefs.current[i];
      if (!item || !grp) continue;

      if (!item.active) {
        grp.visible = false;
        continue;
      }

      const age = nowSec - item.born;
      if (age > lifetime) {
        item.active = false;
        grp.visible = false;
        continue;
      }

      grp.visible = true;

      // 3D physics: gravity & gentle air resistance
      item.x += item.vx * delta;
      item.y += item.vy * delta;
      item.z += item.vz * delta;

      item.vy -= 1.8 * delta; // natural gravity
      item.vx *= 0.986; // air drag
      item.vz *= 0.984;

      item.rx += item.vrx * delta;
      item.ry += item.vry * delta;
      item.rz += item.vrz * delta;

      grp.position.set(item.x, item.y, item.z);
      grp.rotation.set(item.rx, item.ry, item.rz);

      const alpha = age < 0.15 ? age / 0.15 : age > lifetime - 0.6 ? (lifetime - age) / 0.6 : 1.0;
      grp.scale.setScalar(item.scale * Math.min(1, age * 7));

      grp.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.transparent) {
            mat.opacity = THREE.MathUtils.lerp(0, 0.9, alpha);
          }
        }
      });
    }
  });

  return (
    <group>
      {Array.from({ length: POOL_SIZE }).map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          visible={false}
        >
          {/* Miniature Delicate Amber Translucent Film Ribbon (Compact, ~50% scale) */}
          <mesh>
            <planeGeometry args={[0.72, 0.24]} />
            <meshStandardMaterial
              color="#3a2214"
              roughness={0.2}
              metalness={0.4}
              transparent
              opacity={0.88}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* 3 Delicate Miniature Golden Photo Negatives */}
          {[-0.22, 0, 0.22].map((fx, idx) => (
            <group key={`photo-cell-${idx}`} position={[fx, 0, 0.004]}>
              {/* Dainty Gold Filigree Frame */}
              <mesh>
                <ringGeometry args={[0.082, 0.096, 4]} />
                <meshStandardMaterial
                  color={palette.brass}
                  roughness={0.18}
                  metalness={0.92}
                  transparent
                  opacity={0.95}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {/* Fairy-Tale Photo Negative Inset */}
              <mesh>
                <planeGeometry args={[0.17, 0.15]} />
                <meshStandardMaterial
                  color={idx === 1 ? "#fff4e0" : "#ffdfa0"}
                  roughness={0.2}
                  metalness={0.1}
                  transparent
                  opacity={0.7}
                  emissive={palette.glow}
                  emissiveIntensity={0.3}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          ))}

          {/* Dainty Miniature Sprockets (Perforations) */}
          {[-0.095, 0.095].map((py, j) => (
            <group key={`fly-sprocket-${j}`} position={[0, py, 0.005]}>
              {Array.from({ length: 9 }).map((_, k) => (
                <mesh key={`hole-${k}`} position={[-0.3 + k * 0.075, 0, 0]}>
                  <planeGeometry args={[0.03, 0.018]} />
                  <meshStandardMaterial color="#000000" roughness={0.9} transparent opacity={0.85} side={THREE.DoubleSide} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Luminous Star Dust Halo */}
          <mesh position={[0, 0, 0.012]}>
            <ringGeometry args={[0.34, 0.38, 20]} />
            <meshStandardMaterial
              color={palette.glow}
              emissive={palette.glow}
              emissiveIntensity={0.8}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Vintage Bird-Wing Classical Filigree Engravings ───────── */

function BirdWingFiligree({
  palette,
  W,
  H,
  D,
}: {
  palette: CameraPalette;
  W: number;
  H: number;
  D: number;
}) {
  return (
    <group>
      {/* ── Left Wing Filigree on Front Glass Panel ── */}
      <group position={[-0.88, 0.12, D * 0.508]}>
        <mesh rotation={[0, 0, 0.44]}>
          <boxGeometry args={[1.35, 0.026, 0.014]} />
          <meshStandardMaterial color={palette.brass} roughness={0.22} metalness={0.9} />
        </mesh>
        <mesh position={[-0.48, 0.24, 0]} rotation={[0, 0, 0.98]}>
          <boxGeometry args={[0.75, 0.022, 0.012]} />
          <meshStandardMaterial color={palette.brass} roughness={0.22} metalness={0.9} />
        </mesh>

        {Array.from({ length: 9 }).map((_, i) => {
          const t = i / 8;
          const fx = -0.6 + t * 0.9;
          const fy = -0.24 + Math.sin(t * Math.PI) * 0.42;
          const angle = 0.55 + t * 0.95;
          const length = 0.38 + (1 - t) * 0.38;
          return (
            <group key={`feather-l-${i}`} position={[fx, fy, 0]} rotation={[0, 0, angle]}>
              <mesh position={[0, length * 0.5, 0]}>
                <boxGeometry args={[0.018, length, 0.01]} />
                <meshStandardMaterial
                  color={i % 2 === 0 ? palette.brass : palette.steel}
                  roughness={0.24}
                  metalness={0.88}
                />
              </mesh>
              <mesh position={[0, length, 0.004]}>
                <sphereGeometry args={[0.016, 8, 6]} />
                <meshStandardMaterial
                  color={palette.jewel}
                  emissive={palette.jewel}
                  emissiveIntensity={0.5}
                />
              </mesh>
            </group>
          );
        })}

        {[0.14, 0.24, 0.34].map((r, idx) => (
          <mesh key={`scapular-l-${idx}`} position={[0.22, -0.06, 0]}>
            <torusGeometry args={[r, 0.01, 6, 24, Math.PI * 0.9]} />
            <meshStandardMaterial color={palette.brass} roughness={0.24} metalness={0.86} />
          </mesh>
        ))}
      </group>

      {/* ── Right Wing Filigree on Front Glass Panel ── */}
      <group position={[1.28, 0.12, D * 0.508]}>
        <mesh rotation={[0, 0, -0.44]}>
          <boxGeometry args={[1.35, 0.026, 0.014]} />
          <meshStandardMaterial color={palette.brass} roughness={0.22} metalness={0.9} />
        </mesh>
        <mesh position={[0.48, 0.24, 0]} rotation={[0, 0, -0.98]}>
          <boxGeometry args={[0.75, 0.022, 0.012]} />
          <meshStandardMaterial color={palette.brass} roughness={0.22} metalness={0.9} />
        </mesh>

        {Array.from({ length: 9 }).map((_, i) => {
          const t = i / 8;
          const fx = 0.6 - t * 0.9;
          const fy = -0.24 + Math.sin(t * Math.PI) * 0.42;
          const angle = -(0.55 + t * 0.95);
          const length = 0.38 + (1 - t) * 0.38;
          return (
            <group key={`feather-r-${i}`} position={[fx, fy, 0]} rotation={[0, 0, angle]}>
              <mesh position={[0, length * 0.5, 0]}>
                <boxGeometry args={[0.018, length, 0.01]} />
                <meshStandardMaterial
                  color={i % 2 === 0 ? palette.brass : palette.steel}
                  roughness={0.24}
                  metalness={0.88}
                />
              </mesh>
              <mesh position={[0, length, 0.004]}>
                <sphereGeometry args={[0.016, 8, 6]} />
                <meshStandardMaterial
                  color={palette.jewel}
                  emissive={palette.jewel}
                  emissiveIntensity={0.5}
                />
              </mesh>
            </group>
          );
        })}

        {[0.14, 0.24, 0.34].map((r, idx) => (
          <mesh key={`scapular-r-${idx}`} position={[-0.22, -0.06, 0]} rotation={[0, 0, Math.PI * 0.1]}>
            <torusGeometry args={[r, 0.01, 6, 24, Math.PI * 0.9]} />
            <meshStandardMaterial color={palette.brass} roughness={0.24} metalness={0.86} />
          </mesh>
        ))}
      </group>

      {/* ── Winged Crest Emblem on Pentaprism Front ── */}
      <group position={[0.55, H * 0.5 + 0.18, 0.24]}>
        <mesh>
          <torusGeometry args={[0.09, 0.016, 8, 24]} />
          <meshStandardMaterial color={palette.brass} roughness={0.2} metalness={0.92} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.048, 12, 10]} />
          <meshStandardMaterial color={palette.jewel} emissive={palette.jewel} emissiveIntensity={0.65} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={`crest-wing-${s}`} position={[s * 0.1, 0, 0]}>
            <mesh rotation={[0, 0, s * 0.62]}>
              <boxGeometry args={[0.2, 0.016, 0.012]} />
              <meshStandardMaterial color={palette.brass} roughness={0.22} metalness={0.9} />
            </mesh>
            {[0.04, 0.08, 0.12].map((offset, j) => (
              <mesh
                key={`crest-feather-${j}`}
                position={[s * offset, -0.022 * j, 0]}
                rotation={[0, 0, s * (0.8 + j * 0.32)]}
              >
                <boxGeometry args={[0.09, 0.009, 0.007]} />
                <meshStandardMaterial color={palette.glow} roughness={0.24} metalness={0.86} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* ── Winged Corner Brackets on Glass Chassis Corners ── */}
      {[
        [-W * 0.48, H * 0.48, 1, 0],
        [W * 0.48, H * 0.48, -1, 0],
        [-W * 0.48, -H * 0.48, 1, Math.PI],
        [W * 0.48, -H * 0.48, -1, Math.PI],
      ].map(([cx, cy, flipX, rotZ], i) => (
        <group key={`corner-wing-${i}`} position={[cx, cy, D * 0.505]} rotation={[0, 0, rotZ]}>
          <mesh position={[flipX * 0.14, -0.02, 0]} rotation={[0, 0, flipX * -0.35]}>
            <boxGeometry args={[0.28, 0.02, 0.01]} />
            <meshStandardMaterial color={palette.brass} roughness={0.22} metalness={0.9} />
          </mesh>
          <mesh position={[0.02, -0.14, 0]} rotation={[0, 0, flipX * 0.35]}>
            <boxGeometry args={[0.02, 0.28, 0.01]} />
            <meshStandardMaterial color={palette.brass} roughness={0.22} metalness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Exquisitely Engraved 'Oriana Wren' Signature Nameplate ─── */

function OrianaWrenEngravedPlaque({
  palette,
  position = [0.2, 0.78, 0.68],
}: {
  palette: CameraPalette;
  position?: [number, number, number];
}) {
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  if (!textureRef.current && typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Antique parchment / brushed dark brass substrate
      const bgGrad = ctx.createLinearGradient(0, 0, 1024, 256);
      bgGrad.addColorStop(0, "#1c130c");
      bgGrad.addColorStop(0.5, "#342314");
      bgGrad.addColorStop(1, "#160e08");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1024, 256);

      // Ornate dual gold filigree borders
      ctx.strokeStyle = "#e8be6e";
      ctx.lineWidth = 6;
      ctx.strokeRect(18, 18, 988, 220);

      ctx.strokeStyle = "rgba(255, 238, 180, 0.65)";
      ctx.lineWidth = 2;
      ctx.strokeRect(28, 28, 968, 200);

      // Delicate corner star engravings
      ctx.fillStyle = "#ffd888";
      ctx.font = "26px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✦", 44, 44);
      ctx.fillText("✦", 980, 44);
      ctx.fillText("✦", 44, 212);
      ctx.fillText("✦", 980, 212);

      // Delicate ornamental swags
      ctx.fillText("❧", 148, 128);
      ctx.fillText("☙", 876, 128);

      // Deep shadow-carved engraving effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
      ctx.font = "bold 64px 'Cinzel', 'Playfair Display', 'Georgia', serif";
      ctx.fillText("ORIANA WREN", 512, 114);

      // Gleaming gold embossed typography
      const goldGrad = ctx.createLinearGradient(0, 60, 0, 150);
      goldGrad.addColorStop(0, "#ffffff");
      goldGrad.addColorStop(0.2, "#fff2cc");
      goldGrad.addColorStop(0.5, "#e8bc62");
      goldGrad.addColorStop(0.8, "#b4842e");
      goldGrad.addColorStop(1, "#ffe296");
      ctx.fillStyle = goldGrad;
      ctx.fillText("ORIANA WREN", 512, 110);

      // Subtitle engraving
      ctx.fillStyle = "#e2be78";
      ctx.font = "italic 22px 'Playfair Display', 'Georgia', serif";
      ctx.fillText("OPTICAL CHRONOGRAPH • ATELIER EDITION", 512, 172);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    textureRef.current = tex;
  }

  return (
    <group position={position}>
      {/* Polished Brass Beveled Base Plaque */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.38, 0.36, 0.024]} />
        <meshStandardMaterial color={palette.brass} roughness={0.18} metalness={0.92} />
      </mesh>

      {/* Engraved Inscription Face */}
      {textureRef.current && (
        <mesh position={[0, 0, 0.013]} receiveShadow>
          <planeGeometry args={[1.32, 0.31]} />
          <meshStandardMaterial
            map={textureRef.current}
            roughness={0.25}
            metalness={0.65}
          />
        </mesh>
      )}

      {/* 4 Miniature Corner Screws */}
      {[
        [-0.63, 0.14],
        [0.63, 0.14],
        [-0.63, -0.14],
        [0.63, -0.14],
      ].map(([rx, ry], idx) => (
        <mesh key={`plaque-screw-${idx}`} position={[rx, ry, 0.016]}>
          <cylinderGeometry args={[0.018, 0.018, 0.012, 8]} />
          <meshStandardMaterial color={palette.steel} roughness={0.18} metalness={0.95} />
        </mesh>
      ))}

      {/* Crystal Clear Protective Glass Cap that catches top-left specular highlights */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.34, 0.33]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.04}
          metalness={0.12}
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* ── Interactive Virtual Studio Lighting with Top-Left Key Direction ── */

function InteractiveStudioLighting({
  palette,
  pointerRef,
}: {
  palette: CameraPalette;
  pointerRef: React.RefObject<Pointer>;
}) {
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);

  useFrame(() => {
    if (!pointerRef.current) return;
    const px = pointerRef.current.x ?? 0;
    const py = pointerRef.current.y ?? 0;

    // Smooth subtle parallax glint on the top-left directional light
    if (keyLightRef.current) {
      const targetX = -5.4 + px * 2.2;
      const targetY = 6.0 - py * 1.8;
      keyLightRef.current.position.x = THREE.MathUtils.lerp(keyLightRef.current.position.x, targetX, 0.08);
      keyLightRef.current.position.y = THREE.MathUtils.lerp(keyLightRef.current.position.y, targetY, 0.08);
    }

    if (spotLightRef.current) {
      const targetX = -4.0 + px * 1.6;
      const targetY = 4.8 - py * 1.4;
      spotLightRef.current.position.x = THREE.MathUtils.lerp(spotLightRef.current.position.x, targetX, 0.08);
      spotLightRef.current.position.y = THREE.MathUtils.lerp(spotLightRef.current.position.y, targetY, 0.08);
    }
  });

  return (
    <>
      {/* Subtle Ambient Base */}
      <ambientLight intensity={0.68} color={palette.glow} />

      {/* Virtual Key Directional Light from Top-Left (Crisp highlights and contact shadows across camera chassis without visible bulb) */}
      <directionalLight
        ref={keyLightRef}
        position={[-5.4, 6.0, 4.8]}
        intensity={2.4}
        color="#fff9ed"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
        shadow-camera-near={1}
        shadow-camera-far={18}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />

      {/* Top-Left Specular Glisten Light (Highlights crystal bevel edges and golden filigree) */}
      <spotLight
        ref={spotLightRef}
        position={[-4.0, 4.8, 3.8]}
        angle={0.68}
        penumbra={0.8}
        intensity={1.7}
        color="#ffeec4"
      />

      {/* Secondary Fill Light from Bottom-Right (Maintains mechanical contrast and depth) */}
      <directionalLight position={[4.2, -3.2, 2.5]} intensity={0.6} color="#cbd5e1" />
    </>
  );
}

/* ── iris blade ───────────────────────────────────────────── */

const BLADE_COUNT = 9;

function IrisBlade({
  index,
  openAmountRef,
  palette,
}: {
  index: number;
  openAmountRef: React.RefObject<number>;
  palette: CameraPalette;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const baseAngle = (index / BLADE_COUNT) * Math.PI * 2;

  useFrame(() => {
    if (!ref.current) return;
    const amount = openAmountRef.current ?? 0.5;
    const offset = amount * 0.42;
    ref.current.position.set(Math.cos(baseAngle) * (0.2 + offset), Math.sin(baseAngle) * (0.2 + offset), 0);
    ref.current.rotation.z = baseAngle + amount * 0.35;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.26, 0.08, 0.012]} />
      <meshStandardMaterial color={palette.darkWood} roughness={0.48} metalness={0.4} />
    </mesh>
  );
}

/* ── camera scene ─────────────────────────────────────────── */

function CameraScene({
  active,
  reducedMotion,
  pointerRef,
  palette,
  onScreenPositions,
  onFlashProgress,
}: {
  active: boolean;
  reducedMotion: boolean;
  pointerRef: React.RefObject<Pointer>;
  palette: CameraPalette;
  onScreenPositions?: (shutter: { x: number; y: number }, flash: { x: number; y: number }) => void;
  onFlashProgress?: (intensity: number) => void;
}) {
  const assembly = useRef<THREE.Group>(null);
  const flashLight = useRef<THREE.PointLight>(null);
  const flashBulbMesh = useRef<THREE.Mesh>(null);
  const flashFilamentMesh = useRef<THREE.Mesh>(null);
  const flashFlareMesh = useRef<THREE.Mesh>(null);
  const shutterBtnGroup = useRef<THREE.Group>(null);
  const shutterBtnMesh = useRef<THREE.Mesh>(null);
  const filmLever = useRef<THREE.Group>(null);
  const mirror = useRef<THREE.Group>(null);
  const curtainTop = useRef<THREE.Mesh>(null);
  const curtainBot = useRef<THREE.Mesh>(null);
  const mainspring = useRef<THREE.Mesh>(null);
  const { viewport, camera } = useThree();

  const scale = Math.min(1.28, (viewport.width / 7.2) * 1.05);

  const shutterTrigger = useRef(-100);
  const flashIntensity = useRef(0);
  const shutterBoost = useRef(0);
  const openAmountRef = useRef(0.5);
  const gears = useMemo(() => buildInternalGears(), []);
  const tempVec = useMemo(() => new THREE.Vector3(), []);

  /* cleanup */
  useEffect(() => {
    const node = assembly.current;
    return () => {
      if (node) {
        node.traverse((c) => {
          if (c instanceof THREE.Mesh || c instanceof THREE.InstancedMesh) {
            c.geometry?.dispose();
            const mat = c.material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat?.dispose();
          }
        });
      }
    };
  }, []);

  /* listen for shutter click event */
  useEffect(() => {
    const onShutter = () => {
      shutterTrigger.current = performance.now() * 0.001;
      playVintageShutterSound();
    };

    window.addEventListener(SHUTTER_EVENT, onShutter);
    return () => window.removeEventListener(SHUTTER_EVENT, onShutter);
  }, []);

  useFrame((_, delta) => {
    if (!assembly.current || !pointerRef.current) return;

    /* ── High-Fidelity 3D Perspective Rotation & Parallax ── */
    const px = pointerRef.current.x;
    const py = pointerRef.current.y;

    const targetRotX = 0.04 - py * 0.34;
    const targetRotY = -0.14 + px * 0.52;
    const targetRotZ = -px * 0.12;

    assembly.current.rotation.x = THREE.MathUtils.damp(assembly.current.rotation.x, targetRotX, 5, delta);
    assembly.current.rotation.y = THREE.MathUtils.damp(assembly.current.rotation.y, targetRotY, 5, delta);
    assembly.current.rotation.z = THREE.MathUtils.damp(assembly.current.rotation.z, targetRotZ, 5, delta);

    const basePosX = viewport.width > 7 ? 1.8 : 0.4;
    const targetPosX = basePosX + px * 0.48;
    const targetPosY = -0.1 - py * 0.35;
    const targetPosZ = Math.abs(px) * -0.25;

    assembly.current.position.x = THREE.MathUtils.damp(assembly.current.position.x, targetPosX, 4.5, delta);
    assembly.current.position.y = THREE.MathUtils.damp(assembly.current.position.y, targetPosY, 4.5, delta);
    assembly.current.position.z = THREE.MathUtils.damp(assembly.current.position.z, targetPosZ, 4.5, delta);

    // Compute exact screen positions of Shutter Button for HTML hotspot
    if (onScreenPositions && shutterBtnGroup.current && flashBulbMesh.current && typeof window !== "undefined") {
      shutterBtnGroup.current.getWorldPosition(tempVec);
      tempVec.project(camera);
      const shutterScreenX = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
      const shutterScreenY = (-tempVec.y * 0.5 + 0.5) * window.innerHeight;

      flashBulbMesh.current.getWorldPosition(tempVec);
      tempVec.project(camera);
      const flashScreenX = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
      const flashScreenY = (-tempVec.y * 0.5 + 0.5) * window.innerHeight;

      onScreenPositions(
        { x: shutterScreenX, y: shutterScreenY },
        { x: flashScreenX, y: flashScreenY },
      );
    }

    if (!active || reducedMotion) return;

    const nowSec = performance.now() * 0.001;
    const dt = nowSec - shutterTrigger.current;

    /* shutter boost for gears */
    shutterBoost.current = dt < 1.4 ? Math.max(0, 1 - dt / 1.4) : 0;

    /* ── iris aperture ── */
    if (dt < 0.08) {
      openAmountRef.current = THREE.MathUtils.lerp(openAmountRef.current, 0.02, 0.55);
    } else if (dt < 0.45) {
      openAmountRef.current = THREE.MathUtils.lerp(openAmountRef.current, 0.95, 0.22);
    } else {
      openAmountRef.current = 0.48 + Math.sin(nowSec * 0.35) * 0.32;
    }

    /* ── mirror flip ── */
    if (mirror.current) {
      const targetAngle =
        dt < 0.07
          ? -Math.PI * 0.45
          : dt < 0.35
            ? -Math.PI * 0.45 * Math.max(0, 1 - (dt - 0.07) / 0.28)
            : 0;
      mirror.current.rotation.x = THREE.MathUtils.damp(mirror.current.rotation.x, targetAngle, 18, delta);
    }

    /* ── shutter curtains ── */
    if (curtainTop.current && curtainBot.current) {
      if (dt < 0.05) {
        curtainTop.current.scale.y = THREE.MathUtils.damp(curtainTop.current.scale.y, 0.01, 28, delta);
        curtainBot.current.scale.y = THREE.MathUtils.damp(curtainBot.current.scale.y, 0.01, 28, delta);
      } else if (dt < 0.3) {
        curtainTop.current.scale.y = THREE.MathUtils.damp(curtainTop.current.scale.y, 1, 10, delta);
        curtainBot.current.scale.y = THREE.MathUtils.damp(curtainBot.current.scale.y, 1, 10, delta);
      } else {
        curtainTop.current.scale.y = THREE.MathUtils.damp(curtainTop.current.scale.y, 1, 3, delta);
        curtainBot.current.scale.y = THREE.MathUtils.damp(curtainBot.current.scale.y, 1, 3, delta);
      }
    }

    /* ── film lever ── */
    if (filmLever.current) {
      let leverAngle = 0;
      if (dt < 0.45) leverAngle = THREE.MathUtils.smoothstep(dt, 0, 0.45) * 0.58;
      else if (dt < 0.9) leverAngle = (1 - THREE.MathUtils.smoothstep(dt, 0.45, 0.9)) * 0.58;
      filmLever.current.rotation.z = THREE.MathUtils.damp(filmLever.current.rotation.z, -leverAngle, 8, delta);
    }

    /* ── shutter button plunge ── */
    if (shutterBtnMesh.current) {
      const press = dt < 0.18 ? Math.sin((dt / 0.18) * Math.PI) * 0.06 : 0;
      shutterBtnMesh.current.position.y = -press;
    }

    /* ── mainspring pulse ── */
    if (mainspring.current) {
      const pulse = 1 + Math.sin(nowSec * 1.8) * 0.05 + (dt < 1.0 ? 0.15 * (1 - dt / 1.0) : 0);
      mainspring.current.scale.set(pulse, pulse, 1);
    }

    /* ── FLASH LIGHT & AMBIENT BLOOM (Zero flicker in idle state!) ── */
    let flashBloom = 0;
    if (dt >= 0 && dt < 0.06) {
      flashBloom = THREE.MathUtils.smoothstep(dt, 0, 0.06) * 1.0;
    } else if (dt >= 0.06 && dt < 0.8) {
      const progress = (dt - 0.06) / 0.74;
      flashBloom = Math.pow(1 - progress, 2.2);
    }

    // Steady, serene idle state with NO ambient flicker
    const targetIntensity = 0.35 + flashBloom * 7.5;
    flashIntensity.current = THREE.MathUtils.damp(
      flashIntensity.current,
      targetIntensity,
      flashBloom > 0.1 ? 16 : 4,
      delta,
    );

    if (flashLight.current) {
      flashLight.current.intensity = flashIntensity.current;
    }

    if (flashBulbMesh.current) {
      const mat = flashBulbMesh.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = THREE.MathUtils.lerp(0.28, 5.5, flashBloom);
      }
    }
    if (flashFilamentMesh.current) {
      const mat = flashFilamentMesh.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = THREE.MathUtils.lerp(0.85, 12.0, flashBloom);
      }
    }
    if (flashFlareMesh.current) {
      const flareScale = THREE.MathUtils.lerp(0.4, 2.6, Math.sin(flashBloom * Math.PI * 0.5));
      flashFlareMesh.current.scale.set(flareScale, flareScale, flareScale);
      const mat = flashFlareMesh.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = THREE.MathUtils.lerp(0, 0.75, flashBloom);
      }
    }

    // Send only deliberate flash bursts to DOM bloom (0 in idle!)
    onFlashProgress?.(flashBloom);
  });

  const W = 3.6, H = 2.1, D = 1.35;

  // Responsive positioning & scaling for smartphone, tablet & desktop
  const isMobile = viewport.width < 5.2;
  const isTablet = viewport.width >= 5.2 && viewport.width < 7.5;
  const targetPosX = isMobile ? 0 : (isTablet ? 0.8 : 1.8);
  const targetPosY = isMobile ? -0.25 : -0.1;
  const responsiveScaleFactor = isMobile
    ? Math.min(0.66, Math.max(0.48, viewport.width / 6.4))
    : (isTablet ? 0.82 : 0.96);

  return (
    <>
      <InteractiveStudioLighting palette={palette} pointerRef={pointerRef} />
      <group
        ref={assembly}
        position={[targetPosX, targetPosY, 0]}
        scale={scale * responsiveScaleFactor}
        rotation={[0.04, isMobile ? 0 : -0.14, 0]}
      >
      {/* ══════════════ LUXURY TRANSPARENT CRYSTAL SKELETON CHASSIS ══════════════ */}
      {/* Main Transparent Crystal Glass Body */}
      <mesh receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial
          color="#f4f8ff"
          roughness={0.06}
          metalness={0.14}
          transparent
          opacity={0.16}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Crystal Glass Edge Bevel Facets */}
      <mesh>
        <boxGeometry args={[W + 0.015, H + 0.015, D + 0.015]} />
        <meshStandardMaterial color={palette.brass} wireframe transparent opacity={0.18} />
      </mesh>

      {/* Top & Bottom Polished Brass Structural Plates */}
      {[-1, 1].map((s) => (
        <mesh key={`chamfer-${s}`} position={[0, s * H * 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[W + 0.08, 0.065, D + 0.08]} />
          <meshStandardMaterial color={palette.brass} roughness={0.22} metalness={0.88} />
        </mesh>
      ))}

      {/* Top Crystal Inspection Skylight Dome (Over Balance Wheel) */}
      <group position={[-1.05, H * 0.5 + 0.035, 0.05]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.03, 32]} />
          <meshStandardMaterial color={palette.brass} roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.018, 0]}>
          <cylinderGeometry args={[0.29, 0.29, 0.02, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.04}
            metalness={0.1}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* 4 Corner Brass Structural Columns with Synthetic Ruby Jewel Rivets */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <group key={`corner-col-${i}`} position={[sx * W * 0.495, 0, sz * D * 0.495]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.048, 0.048, H, 16]} />
            <meshStandardMaterial color={palette.brass} roughness={0.26} metalness={0.85} />
          </mesh>
          {[-H * 0.45, 0, H * 0.45].map((y, j) => (
            <mesh key={`rivet-${j}`} position={[0, y, 0]}>
              <sphereGeometry args={[0.054, 10, 8]} />
              <meshStandardMaterial color={j === 1 ? palette.jewel : palette.steel} roughness={0.2} metalness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Side Crystal Observation Portholes */}
      {[-1, 1].map((side) => (
        <group key={`side-port-${side}`} position={[side * (W * 0.502), 0, 0]} rotation={[0, (side * Math.PI) / 2, 0]}>
          <mesh castShadow receiveShadow>
            <ringGeometry args={[0.26, 0.32, 28]} />
            <meshStandardMaterial color={palette.brass} roughness={0.22} metalness={0.88} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <circleGeometry args={[0.255, 28]} />
            <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0.1} transparent opacity={0.25} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Internal Perlage Skeleton Bridge Plates */}
      {[-0.2, 0.2].map((z, idx) => (
        <group key={`bridge-plate-${idx}`} position={[0, 0, z]}>
          <mesh position={[-0.8, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.16, 0.02]} />
            <meshStandardMaterial color={palette.brass} roughness={0.34} metalness={0.78} transparent opacity={0.45} />
          </mesh>
          <mesh position={[-0.6, -0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.22, 0.02]} />
            <meshStandardMaterial color={palette.brass} roughness={0.34} metalness={0.78} transparent opacity={0.45} />
          </mesh>
          <mesh position={[0.9, -0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.7, 0.02]} />
            <meshStandardMaterial color={palette.brass} roughness={0.34} metalness={0.78} transparent opacity={0.4} />
          </mesh>
          {[-1.2, -0.6, 0.6, 1.2].map((cx, i) => (
            <mesh key={`cutout-${i}`} position={[cx, 0.2, 0]}>
              <ringGeometry args={[0.12, 0.18, 16]} />
              <meshStandardMaterial color={palette.steel} roughness={0.28} metalness={0.85} transparent opacity={0.65} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Rear Côtes de Genève Satin Horological Backplate */}
      <group position={[0, 0, -D * 0.48]}>
        <mesh receiveShadow>
          <planeGeometry args={[W * 0.94, H * 0.92]} />
          <meshStandardMaterial
            color="#221810"
            roughness={0.45}
            metalness={0.35}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
        {Array.from({ length: 12 }).map((_, li) => (
          <mesh key={`geneva-stripe-${li}`} position={[0, -H * 0.42 + li * 0.075, 0.002]}>
            <planeGeometry args={[W * 0.92, 0.035]} />
            <meshStandardMaterial
              color={palette.brass}
              roughness={0.3}
              metalness={0.75}
              transparent
              opacity={0.18}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* ── Grip Ribs (Left Face) ── */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={`grip-${i}`} position={[-W * 0.42, -H * 0.44 + i * 0.07, D * 0.505]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.032, 0.04]} />
          <meshStandardMaterial color={palette.darkWood} roughness={0.75} metalness={0.06} />
        </mesh>
      ))}
      <mesh position={[-W * 0.42, -H * 0.02, D * 0.51]}>
        <boxGeometry args={[0.5, H * 0.72, 0.02]} />
        <meshStandardMaterial color={palette.darkWood} roughness={0.7} metalness={0.05} transparent opacity={0.5} />
      </mesh>

      {/* ══════════════ EXQUISITE 'ORIANA WREN' ENGRAVED NAMEPLATE ══════════════ */}
      <OrianaWrenEngravedPlaque palette={palette} position={[0.2, 0.78, D * 0.506]} />

      {/* ══════════════ CLASSICAL BIRD-WING FILIGREE ENGRAVINGS ══════════════ */}
      <BirdWingFiligree palette={palette} W={W} H={H} D={D} />

      {/* ══════════════ IN-CHASSIS FILM TAPE REEL & PHOTO FRAMES ══════════════ */}
      <InChassisFilmTape
        palette={palette}
        shutterBoost={shutterBoost}
        active={active}
        reducedMotion={reducedMotion}
      />

      {/* ══════════════ HOROLOGICAL ESCAPEMENT & BALANCE WHEEL ══════════════ */}
      <HorologicalEscapement
        position={[-1.05, 0.25, 0.05]}
        active={active}
        reducedMotion={reducedMotion}
        palette={palette}
        shutterBoost={shutterBoost}
      />

      {/* ══════════════ PLANETARY DIFFERENTIAL GEARBOX ══════════════ */}
      <PlanetaryGearbox
        position={[0.95, -0.32, 0.04]}
        active={active}
        reducedMotion={reducedMotion}
        palette={palette}
        shutterBoost={shutterBoost}
      />

      {/* ══════════════ CENTRIFUGAL FLYBALL GOVERNOR ══════════════ */}
      <CentrifugalGovernor
        position={[-0.45, -0.45, 0.12]}
        active={active}
        reducedMotion={reducedMotion}
        palette={palette}
        shutterBoost={shutterBoost}
      />

      {/* ══════════════ DUAL STEAMPUNK GAUGE DIALS ══════════════ */}
      <GaugeDial
        position={[-1.25, -0.58, D * 0.502]}
        palette={palette}
        shutterBoost={shutterBoost}
      />
      <GaugeDial
        position={[1.25, -0.58, D * 0.502]}
        palette={palette}
        shutterBoost={shutterBoost}
      />

      {/* ══════════════ EXPANDED INTERNAL GEAR TRAIN ══════════════ */}
      {gears.map((g, i) => (
        <Gear
          key={i}
          cfg={g}
          idx={i}
          active={active}
          reducedMotion={reducedMotion}
          pointerRef={pointerRef}
          palette={palette}
          shutterBoost={shutterBoost}
        />
      ))}

      {/* ══════════════ MIRROR REFLEX MECHANISM ══════════════ */}
      <group ref={mirror} position={[0.2, 0, -0.06]}>
        <mesh rotation={[Math.PI * 0.25, 0, 0]}>
          <planeGeometry args={[0.82, 0.65]} />
          <meshStandardMaterial color={palette.steel} roughness={0.06} metalness={0.94} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[Math.PI * 0.25, 0, 0]}>
          <ringGeometry args={[0.36, 0.42, 4]} />
          <meshStandardMaterial color={palette.brass} roughness={0.28} metalness={0.82} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ══════════════ FOCAL PLANE SHUTTER CURTAINS ══════════════ */}
      <mesh ref={curtainTop} position={[0.2, 0.28, 0.08]}>
        <planeGeometry args={[0.74, 0.28]} />
        <meshStandardMaterial color={palette.darkWood} roughness={0.6} metalness={0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={curtainBot} position={[0.2, -0.24, 0.08]}>
        <planeGeometry args={[0.74, 0.28]} />
        <meshStandardMaterial color={palette.darkWood} roughness={0.6} metalness={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* ══════════════ MAINSPRING BARREL ══════════════ */}
      <mesh ref={mainspring} position={[-0.85, -0.18, -0.28]}>
        <torusGeometry args={[0.24, 0.02, 8, 48, Math.PI * 5]} />
        <meshStandardMaterial color={palette.brass} roughness={0.28} metalness={0.84} />
      </mesh>
      <mesh position={[-0.85, -0.18, -0.28]}>
        <torusGeometry args={[0.28, 0.025, 6, 36]} />
        <meshStandardMaterial color={palette.steel} roughness={0.32} metalness={0.8} />
      </mesh>

      {/* ══════════════ 4-TIER RETRO-FOCUS LENS BARREL ══════════════ */}
      <group position={[0.2, 0, D * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.92, 0.92, 0.26, 40]} />
          <meshStandardMaterial color={palette.brass} roughness={0.25} metalness={0.84} />
        </mesh>
        {[0, 0.05, -0.05].map((yOff, i) => (
          <mesh key={`groove-${i}`} position={[0, yOff, 0]}>
            <torusGeometry args={[0.93 + i * 0.012, 0.022, 6, 40]} />
            <meshStandardMaterial color={i === 1 ? palette.steel : palette.brass} roughness={0.24} metalness={0.85} />
          </mesh>
        ))}

        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.74, 0.82, 0.24, 40]} />
          <meshStandardMaterial color={palette.wood} roughness={0.55} metalness={0.12} transparent opacity={0.65} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <torusGeometry args={[0.75, 0.018, 6, 40]} />
          <meshStandardMaterial color={palette.brass} roughness={0.26} metalness={0.82} />
        </mesh>
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return (
            <mesh key={`fmark-${i}`} position={[Math.cos(a) * 0.78, 0.24, Math.sin(a) * 0.78]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.01, 0.05, 0.01]} />
              <meshStandardMaterial color={palette.brass} roughness={0.28} metalness={0.8} />
            </mesh>
          );
        })}

        <mesh position={[0, 0.46, 0]} castShadow>
          <cylinderGeometry args={[0.58, 0.68, 0.22, 40]} />
          <meshStandardMaterial color={palette.darkWood} roughness={0.5} metalness={0.15} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0, 0.46, 0]}>
          <torusGeometry args={[0.59, 0.015, 6, 40]} />
          <meshStandardMaterial color={palette.steel} roughness={0.28} metalness={0.8} />
        </mesh>

        <mesh position={[0, 0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.54, 40]} />
          <meshStandardMaterial color={palette.lens} roughness={0.04} metalness={0.5} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, 0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.48, 0.54, 40]} />
          <meshStandardMaterial color="#4a70b5" roughness={0.08} metalness={0.35} transparent opacity={0.25} />
        </mesh>

        {/* 9-Blade Iris Aperture */}
        <group position={[0, 0.52, 0]}>
          {Array.from({ length: BLADE_COUNT }).map((_, i) => (
            <IrisBlade key={i} index={i} openAmountRef={openAmountRef} palette={palette} />
          ))}
        </group>

        {[0.1, 0.3, 0.42].map((y, i) => (
          <mesh key={`intelem-${i}`} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.15 + i * 0.08, 0.35 + i * 0.05, 28]} />
            <meshStandardMaterial color={palette.lens} roughness={0.06} metalness={0.42} transparent opacity={0.22} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>

      {/* ══════════════ VIEWFINDER PENTAPRISM HOUSING ══════════════ */}
      <group position={[0.55, H * 0.5 + 0.06, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.32, 0.46]} />
          <meshStandardMaterial color={palette.wood} roughness={0.6} metalness={0.1} transparent opacity={0.28} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.18, 0.18, 0.28]} />
          <meshStandardMaterial color={palette.lens} roughness={0.05} metalness={0.55} transparent opacity={0.4} />
        </mesh>
        {[-0.22, 0.22].map((x, i) => (
          <mesh key={`vff-${i}`} position={[x, 0.05, 0.235]}>
            <planeGeometry args={[0.2, 0.15]} />
            <meshStandardMaterial color={palette.lens} roughness={0.05} metalness={0.4} transparent opacity={0.45} />
          </mesh>
        ))}
        {[-0.22, 0.22].map((x, i) => (
          <mesh key={`vff-frame-${i}`} position={[x, 0.05, 0.23]}>
            <boxGeometry args={[0.24, 0.19, 0.02]} />
            <meshStandardMaterial color={palette.brass} roughness={0.3} metalness={0.76} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>

      {/* ══════════════ 3D SHUTTER BUTTON ASSEMBLY ══════════════ */}
      <group ref={shutterBtnGroup} position={[1.2, H * 0.5 + 0.07, 0.22]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.17, 0.1, 24]} />
          <meshStandardMaterial color={palette.brass} roughness={0.24} metalness={0.88} />
        </mesh>
        <mesh position={[0, 0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.155, 0.018, 8, 28]} />
          <meshStandardMaterial
            color="#ffe082"
            emissive="#ffb300"
            emissiveIntensity={0.5}
            roughness={0.18}
          />
        </mesh>
        <mesh ref={shutterBtnMesh} position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.12, 0.07, 24]} />
          <meshStandardMaterial
            color={palette.jewel}
            roughness={0.12}
            metalness={0.65}
            emissive={palette.jewel}
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>

      {/* ══════════════ ANTIQUE OIL-LAMP FLASH UNIT ══════════════ */}
      <group position={[-0.55, H * 0.5 + 0.5, 0.06]}>
        <mesh position={[0, -0.38, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.28, 14]} />
          <meshStandardMaterial color={palette.brass} roughness={0.26} metalness={0.85} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshStandardMaterial color={palette.steel} roughness={0.28} metalness={0.8} />
        </mesh>

        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.06]}>
          <cylinderGeometry args={[0.68, 0.22, 0.24, 36, 1, true]} />
          <meshStandardMaterial
            color={palette.brass}
            roughness={0.2}
            metalness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <torusGeometry args={[0.68, 0.026, 8, 40]} />
          <meshStandardMaterial color={palette.brass} roughness={0.18} metalness={0.92} />
        </mesh>
        {Array.from({ length: 20 }).map((_, i) => {
          const a = (i / 20) * Math.PI * 2;
          return (
            <mesh key={`fl-petal-${i}`} position={[Math.cos(a) * 0.4, Math.sin(a) * 0.4, -0.02]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.018, 0.48, 0.012]} />
              <meshStandardMaterial color={palette.steel} roughness={0.22} metalness={0.88} />
            </mesh>
          );
        })}

        <mesh ref={flashBulbMesh} position={[0, 0, 0.1]}>
          <sphereGeometry args={[0.2, 28, 24]} />
          <meshStandardMaterial
            color="#fff3e0"
            roughness={0.08}
            metalness={0.18}
            transparent
            opacity={0.78}
            emissive="#ffcc80"
            emissiveIntensity={0.28}
          />
        </mesh>

        <mesh ref={flashFilamentMesh} position={[0, 0, 0.1]}>
          <torusGeometry args={[0.075, 0.018, 8, 24]} />
          <meshStandardMaterial
            color="#ffe082"
            emissive="#ffa000"
            emissiveIntensity={0.85}
            roughness={0.08}
          />
        </mesh>

        <mesh ref={flashFlareMesh} position={[0, 0, 0.15]}>
          <circleGeometry args={[0.75, 36]} />
          <meshBasicMaterial
            color="#ffe6a0"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        <pointLight
          ref={flashLight}
          position={[0, 0, 0.18]}
          color="#ffeedd"
          intensity={0.35}
          distance={12}
          decay={2}
        />
      </group>

      {/* ══════════════ FILM ADVANCE CRANK LEVER ══════════════ */}
      <group ref={filmLever} position={[1.45, H * 0.5 + 0.09, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.58, 0.065, 0.14]} />
          <meshStandardMaterial color={palette.brass} roughness={0.28} metalness={0.8} />
        </mesh>
        <mesh position={[0.29, 0, 0]}>
          <sphereGeometry args={[0.06, 14, 10]} />
          <meshStandardMaterial color={palette.darkWood} roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[-0.29, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.16, 10]} />
          <meshStandardMaterial color={palette.steel} roughness={0.28} metalness={0.78} />
        </mesh>
      </group>

      {/* ══════════════ SHUTTER SPEED & ISO SELECTOR DIAL ══════════════ */}
      <group position={[-1.25, H * 0.5 + 0.05, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.25, 28]} />
          <meshStandardMaterial color={palette.brass} roughness={0.26} metalness={0.82} />
        </mesh>
        {Array.from({ length: 20 }).map((_, i) => {
          const a = (i / 20) * Math.PI * 2;
          return (
            <mesh key={`knurl-dial-${i}`} position={[Math.cos(a) * 0.215, 0, Math.sin(a) * 0.215]} rotation={[Math.PI / 2, 0, a]}>
              <boxGeometry args={[0.016, 0.23, 0.022]} />
              <meshStandardMaterial color={palette.darkWood} roughness={0.48} metalness={0.4} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 28]} />
          <meshStandardMaterial color={palette.steel} roughness={0.22} metalness={0.82} />
        </mesh>
      </group>

      {/* ══════════════ HOT SHOE & ACCESSORY MOUNT ══════════════ */}
      <group position={[0.0, H * 0.5 + 0.03, 0]}>
        <mesh>
          <boxGeometry args={[0.48, 0.045, 0.3]} />
          <meshStandardMaterial color={palette.brass} roughness={0.28} metalness={0.8} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={`hs-rail-${s}`} position={[0, 0.03, s * 0.135]}>
            <boxGeometry args={[0.46, 0.024, 0.03]} />
            <meshStandardMaterial color={palette.steel} roughness={0.28} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* ══════════════ STRAP LUGS ══════════════ */}
      {[-1, 1].map((s) => (
        <group key={`cam-lug-${s}`} position={[s * W * 0.52, H * 0.3, 0]}>
          <mesh>
            <torusGeometry args={[0.09, 0.02, 8, 20]} />
            <meshStandardMaterial color={palette.brass} roughness={0.3} metalness={0.76} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.045, 0.07, 0.045]} />
            <meshStandardMaterial color={palette.brass} roughness={0.32} metalness={0.74} />
          </mesh>
        </group>
      ))}

      {/* ══════════════ DECORATIVE ASTRAL CELESTIAL RINGS ══════════════ */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`astral-ring-${i}`} position={[0.2, 0, 0.25 + i * 0.05]}>
          <ringGeometry args={[2.35 + i * 0.1, 2.38 + i * 0.1, 72]} />
          <meshStandardMaterial
            color={i % 2 === 1 ? palette.steel : palette.brass}
            metalness={0.8}
            roughness={0.28}
            transparent
            opacity={0.22 - i * 0.04}
          />
        </mesh>
      ))}

      {/* ══════════════ EJECTED FLYING FILM STRIPS (Left to Right) ══════════════ */}
      <FlyingFilmStripsPool palette={palette} />

      {/* Secondary Warm Lens Radiance Fill */}
      <pointLight position={[0.2, 0, D * 0.85]} color="#ffe8c8" intensity={0.2} distance={5} decay={2} />
    </group>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════════ */

export function AlbumCamera({ environment }: { environment: EnvironmentState }) {
  const container = useRef<HTMLDivElement>(null);
  const pointer = useRef<Pointer>({ x: 0, y: 0, energy: 0, prevX: 0, prevY: 0 });
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [shutterCooldown, setShutterCooldown] = useState(false);
  const [scrolledPast, setScrolledPast] = useState(false);

  const [shutterPos, setShutterPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window !== "undefined") {
      return { x: window.innerWidth * 0.72, y: window.innerHeight * 0.38 };
    }
    return null;
  });
  const [flashPos, setFlashPos] = useState<{ x: number; y: number } | null>(null);
  const [flashIntensity, setFlashIntensity] = useState(0);

  const palette = useMemo<CameraPalette>(() => {
    switch (environment.preset) {
      case "sakura":
        return {
          wood: "#8b5a4a",
          darkWood: "#4a2c24",
          brass: "#d4a373",
          steel: "#9bb0c1",
          jewel: "#e56b8f",
          lens: "#a8dadc",
          glow: "#ffb7b2",
        };
      case "fireflies":
        return {
          wood: "#5c4033",
          darkWood: "#2b1810",
          brass: "#c99a5b",
          steel: "#7a8288",
          jewel: "#9d4edd",
          lens: "#48cae4",
          glow: "#ffd166",
        };
      case "autumn":
        return {
          wood: "#704828",
          darkWood: "#3a2010",
          brass: "#d9822b",
          steel: "#8c7e72",
          jewel: "#d00000",
          lens: "#ffba08",
          glow: "#f48c06",
        };
      case "rain":
        return {
          wood: "#3d4a52",
          darkWood: "#1c2429",
          brass: "#8fa89b",
          steel: "#6c7a89",
          jewel: "#48bfe3",
          lens: "#72efdd",
          glow: "#80ced6",
        };
      case "mist":
        return {
          wood: "#45585c",
          darkWood: "#29353a",
          brass: "#c4b5a0",
          steel: "#8a9ea8",
          jewel: "#5eb1bf",
          lens: "#829aa4",
          glow: "#dfe7e3",
        };
      case "snow":
      default:
        return {
          wood: "#4a3c31",
          darkWood: "#231a14",
          brass: "#c8963e",
          steel: "#8a9ba8",
          jewel: "#c7385c",
          lens: "#5eb1bf",
          glow: "#ffe8b6",
        };
    }
  }, [environment.preset]);

  const handleScreenPositions = useCallback(
    (shutter: { x: number; y: number }, flash: { x: number; y: number }) => {
      setShutterPos((prev) => {
        if (!prev || Math.hypot(prev.x - shutter.x, prev.y - shutter.y) > 0.8) {
          return shutter;
        }
        return prev;
      });
      setFlashPos((prev) => {
        if (!prev || Math.hypot(prev.x - flash.x, prev.y - flash.y) > 0.8) {
          return flash;
        }
        return prev;
      });
    },
    [],
  );

  const handleFlashProgress = useCallback((intensity: number) => {
    setFlashIntensity(intensity);
  }, []);

  const fireShutter = useCallback(() => {
    window.dispatchEvent(new CustomEvent(SHUTTER_EVENT));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([15, 30, 20]);
      } catch {}
    }
    setShutterCooldown(true);
    setTimeout(() => setShutterCooldown(false), 90);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(motion.matches);
    update();
    motion.addEventListener("change", update);

    const onScroll = () => {
      setScrolledPast(window.scrollY > 30);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.current.energy = Math.min(
        1,
        pointer.current.energy + Math.hypot(x - pointer.current.prevX, y - pointer.current.prevY) * 2.6,
      );
      pointer.current.prevX = x;
      pointer.current.prevY = y;
      pointer.current.x = x;
      pointer.current.y = y;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      const t = e.touches[0];
      const x = (t.clientX / window.innerWidth) * 2 - 1;
      const y = (t.clientY / window.innerHeight) * 2 - 1;
      pointer.current.energy = Math.min(
        1,
        pointer.current.energy + Math.hypot(x - pointer.current.prevX, y - pointer.current.prevY) * 3.2,
      );
      pointer.current.prevX = x;
      pointer.current.prevY = y;
      pointer.current.x = x;
      pointer.current.y = y;
    };

    const onTouchEnd = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
      pointer.current.energy = 0;
    };

    const onLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
      pointer.current.energy = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      motion.removeEventListener("change", update);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  /* ── Global "F" Key Shortcut for Flash ── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "f" || e.key === "F") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable ||
            target.closest("[role='dialog']") ||
            target.closest("input, textarea, select"))
        ) {
          return;
        }

        e.preventDefault();
        fireShutter();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fireShutter]);

  const flashX = flashPos?.x ?? (typeof window !== "undefined" ? window.innerWidth * 0.65 : 800);
  const flashY = flashPos?.y ?? (typeof window !== "undefined" ? window.innerHeight * 0.35 : 300);

  return (
    <>
      {/* ── Three.js Canvas ─────────────────────────── */}
      <div
        ref={container}
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.48] mix-blend-screen"
        aria-hidden="true"
      >
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          frameloop={visible && !reducedMotion ? "always" : "demand"}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 7.2], fov: 38 }}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        >
          <CameraScene
            active={visible}
            reducedMotion={reducedMotion}
            pointerRef={pointer}
            palette={palette}
            onScreenPositions={handleScreenPositions}
            onFlashProgress={handleFlashProgress}
          />
        </Canvas>
      </div>

      {/* ── Atmospheric Fairy-Tale Flash Glow (Only active on intentional flash click, 0 in idle) ── */}
      {flashIntensity > 0.02 && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-75 z-[15]"
          style={{
            opacity: Math.min(1, flashIntensity * 1.15),
            background: `radial-gradient(circle 850px at ${flashX}px ${flashY}px, rgba(255, 238, 195, ${Math.min(0.65, flashIntensity * 0.58)}) 0%, rgba(255, 195, 110, ${Math.min(0.42, flashIntensity * 0.38)}) 28%, rgba(255, 140, 50, ${Math.min(0.2, flashIntensity * 0.18)}) 55%, transparent 75%)`,
            backdropFilter: `brightness(${1 + flashIntensity * 0.18}) saturate(${1 + flashIntensity * 0.24})`,
          }}
        />
      )}

      {/* ── Tactile Interactive Shutter Button (Calm, elegant, non-pulsing in idle) ── */}
      {shutterPos && (
        <button
          type="button"
          onClick={fireShutter}
          disabled={scrolledPast}
          aria-label="Trigger vintage flash (Press F)"
          title="Trigger vintage flash (Shortcut: F)"
          className={`
            fixed z-[35] -translate-x-1/2 -translate-y-1/2 group outline-none transition-opacity duration-300 cursor-pointer
            ${scrolledPast ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"}
          `}
          style={{
            left: `${typeof window !== "undefined" ? Math.max(32, Math.min(window.innerWidth - 32, shutterPos.x)) : shutterPos.x}px`,
            top: `${typeof window !== "undefined" ? Math.max(72, Math.min(window.innerHeight - 80, shutterPos.y)) : shutterPos.y}px`,
          }}
        >
          {/* Subtle static warm aura - no continuous pulsating in idle */}
          <span
            className={`
              absolute -inset-2.5 rounded-full
              bg-[radial-gradient(circle,rgba(255,215,130,0.35)_0%,rgba(255,170,50,0.1)_60%,transparent_80%)]
              pointer-events-none transition-all duration-300
              ${shutterCooldown ? "opacity-100 scale-125" : "opacity-0 group-hover:opacity-100 group-hover:scale-125"}
            `}
          />

          {/* Tactile Brass Button Housing */}
          <span
            className={`
              relative flex items-center justify-center
              h-11 w-11 rounded-full
              border border-[rgba(255,225,160,0.4)]
              bg-[radial-gradient(circle_at_35%_30%,rgba(255,245,220,0.55),rgba(140,95,45,0.45))]
              backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.35),0_0_12px_rgba(255,200,100,0.25)]
              transition-all duration-100 ease-out cursor-pointer
              group-hover:scale-115 group-hover:border-[rgba(255,235,180,0.8)]
              group-hover:shadow-[0_6px_22px_rgba(0,0,0,0.4),0_0_24px_rgba(255,215,120,0.65)]
              ${shutterCooldown ? "scale-90 translate-y-0.5 bg-[rgba(255,220,150,0.7)]" : "group-active:scale-90 group-active:translate-y-0.5"}
            `}
          >
            {/* Shutter aperture icon */}
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#fff8eb] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" className="opacity-70 group-hover:opacity-100 transition-opacity" />
              <circle cx="12" cy="12" r="5" fill="currentColor" className="opacity-40 group-hover:opacity-75 group-hover:text-[#ffe29a] transition-all" />
              <circle cx="12" cy="12" r="2" fill="currentColor" className="text-white opacity-90" />
            </svg>

            {/* Micro Hotkey Hint Badge on Button - Adaptive for mobile (⚡) and desktop (F) */}
            <span
              className={`
                absolute -bottom-0.5 -right-0.5 flex items-center justify-center
                w-4 h-4 rounded-full
                bg-[rgba(24,18,12,0.88)] border border-[rgba(255,220,140,0.55)]
                text-[0.52rem] font-mono font-bold text-[#ffe09e]
                shadow-[0_2px_6px_rgba(0,0,0,0.45)]
                transition-all duration-200 pointer-events-none select-none
                ${shutterCooldown ? "scale-125 bg-[rgba(255,200,90,0.92)] text-[#2a1705] border-[#ffd070]" : "group-hover:scale-110 group-hover:border-[rgba(255,235,170,0.9)]"}
              `}
              title="Shortcut: F / Tap"
            >
              <span className="hidden sm:inline">F</span>
              <span className="sm:hidden text-[0.55rem] leading-none">⚡</span>
            </span>
          </span>

          {/* Floating Tooltip Pill on Hover with Key Indicator */}
          <span
            className="
              absolute left-1/2 -bottom-8 -translate-x-1/2 whitespace-nowrap
              flex items-center gap-1.5
              px-2.5 py-0.5 rounded-full
              text-[0.62rem] font-medium tracking-wide
              text-[#ffecc8] bg-[rgba(20,15,10,0.82)] backdrop-blur-md
              border border-[rgba(255,215,130,0.35)]
              shadow-[0_4px_16px_rgba(0,0,0,0.4)] pointer-events-none select-none
              transition-all duration-300
              opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
            "
          >
            <span>Flash</span>
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.2 min-w-[14px] h-3.5 rounded text-[0.52rem] font-mono font-bold bg-white/15 border border-white/25 text-[#fff8eb] shadow-inner">
              F
            </kbd>
          </span>
        </button>
      )}
    </>
  );
}
