"use client";

import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { createSeededRandom } from "@/lib/environment/deterministic-random";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { WindRuntime } from "@/lib/environment/wind";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import { MistShaderMaterial } from "./mist-shader";

// ─── Shared geometry for mist cards ─────────────────────────────────────────
// One plane, reused across all layers. Created once, never inside useFrame.
let _mistPlaneGeom: THREE.PlaneGeometry | null = null;
function getMistPlaneGeom(): THREE.PlaneGeometry {
  if (!_mistPlaneGeom) {
    _mistPlaneGeom = new THREE.PlaneGeometry(1, 1);
  }
  return _mistPlaneGeom;
}

// ─── Phase-aware mist tint ───────────────────────────────────────────────────
function getMistTintForState(state: EnvironmentState): THREE.Color {
  const tintMap: Record<string, string> = {
    "mist:day":    "#d8e4e2",
    "mist:sunset": "#c8b4a0",
    "mist:night":  "#8dafc6",
  };
  return new THREE.Color(tintMap[`${state.preset}:${state.phase}`] ?? "#cdd5d2");
}

// ─── Individual mist layer ───────────────────────────────────────────────────
interface MistLayerConfig {
  count: number;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  scaleRange: [number, number]; // x/z card scale
  heightRange: [number, number]; // y card height scale
  opacityRange: [number, number];
  driftSpeedRange: [number, number];
  driftAmpRange: [number, number];
  verticalDriftAmp: number;
  seedOffset: number;
  isForeground?: boolean;
}

function MistLayer({
  config,
  tint,
  wind,
  preferences,
  active,
  reducedMotion,
}: {
  config: MistLayerConfig;
  tint: THREE.Color;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
  reducedMotion: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geom = useMemo(() => getMistPlaneGeom().clone(), []);
  
  const dev = typeof window !== "undefined" ? (window as any).__DEV_LAB__ || {} : {};

  const mat = useMemo(() => new MistShaderMaterial(tint), [tint]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = reducedMotion ? Math.max(2, Math.floor(config.count * 0.3)) : config.count;

  const instanceData = useMemo(() => {
    const prng = createSeededRandom(config.seedOffset * 997 + 13);
    return Array.from({ length: count }, (_, i) => {
      let x = prng.range(config.xRange[0], config.xRange[1]);
      // Explicitly push foreground veil away from the center (safe zone)
      if (config.isForeground) {
        if (x > -3 && x < 3) {
          x = x < 0 ? x - 4 : x + 4;
        }
      }
      return {
        x,
        y: prng.range(config.yRange[0], config.yRange[1]),
        z: prng.range(config.zRange[0], config.zRange[1]),
        scaleX: prng.range(config.scaleRange[0], config.scaleRange[1]),
        scaleY: prng.range(config.heightRange[0], config.heightRange[1]),
        opacity: prng.range(config.opacityRange[0], config.opacityRange[1]),
        driftSpeed: prng.range(config.driftSpeedRange[0], config.driftSpeedRange[1]),
        driftAmp: prng.range(config.driftAmpRange[0], config.driftAmpRange[1]),
        vertPhase: prng.range(0, Math.PI * 2),
        driftPhase: prng.range(0, Math.PI * 2),
        rotY: prng.range(0, Math.PI * 2),
        seed: prng.value(),
      };
    });
  }, [count, config]);

  // Set initial matrices and attributes
  useEffect(() => {
    if (!mesh.current) return;
    
    const seedArray = new Float32Array(count);
    const opacityArray = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const d = instanceData[i];
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.y = d.rotY;
      dummy.scale.set(d.scaleX, d.scaleY, 1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      
      seedArray[i] = d.seed;
      opacityArray[i] = d.opacity;
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    
    geom.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seedArray, 1));
    geom.setAttribute('aOpacity', new THREE.InstancedBufferAttribute(opacityArray, 1));
  }, [count, instanceData, dummy, geom]);

  useFrame(({ clock }) => {
    if (!mesh.current || !active) return;
    const time = clock.elapsedTime;
    
    // Check dev toggles dynamically (without reacting to re-renders)
    const devLab = typeof window !== "undefined" ? (window as any).__DEV_LAB__ || {} : {};
    if (devLab.freezeAnimation) return;

    const atmosFactor = preferences.atmosphere / 100;
    const windX = wind.current.current.x * (preferences.windSpeed / 100) * 0.12;

    for (let i = 0; i < count; i++) {
      const d = instanceData[i];

      const drift = reducedMotion
        ? 0
        : Math.sin(time * d.driftSpeed + d.driftPhase) * d.driftAmp + windX * time * 0.02;

      const vertDrift = reducedMotion
        ? 0
        : Math.sin(time * 0.18 + d.vertPhase) * config.verticalDriftAmp;

      dummy.position.set(d.x + drift, d.y + vertDrift, d.z);
      dummy.rotation.y = d.rotY + time * 0.008 * d.driftSpeed;
      dummy.scale.set(d.scaleX, d.scaleY, 1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;

    // Update uniforms
    mat.uniforms.uTime.value = time;
    mat.uniforms.uOpacity.value = atmosFactor * (devLab.mistOpacityMultiplier ?? 1.0);
    mat.uniforms.uSpeed.value = devLab.mistMotionSpeed ?? 1.0;
    mat.uniforms.uEdgeDebug.value = devLab.mistEdgeDebug ? 1.0 : 0.0;
    mat.uniforms.uContrast.value = devLab.mistNoiseContrast ?? 1.2;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geom, mat, count]}
      renderOrder={1}
      frustumCulled={false}
    />
  );
}

// ─── Ground mist — low creeping fog sheets ───────────────────────────────────
function GroundMist({
  tint,
  wind,
  preferences,
  active,
  reducedMotion,
  quality,
}: {
  tint: THREE.Color;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
  reducedMotion: boolean;
  quality: EnvironmentQuality;
}) {
  const count = quality.tier === "full" ? 8 : 4;
  const config: MistLayerConfig = {
    count,
    xRange: [-14, 14],
    yRange: [-3.5, -1.5],
    zRange: [-12, 2],
    scaleRange: [6, 12],
    heightRange: [1.2, 2.5],
    opacityRange: [0.08, 0.22],
    driftSpeedRange: [0.04, 0.09],
    driftAmpRange: [1.5, 3.0],
    verticalDriftAmp: 0.25,
    seedOffset: 500,
  };

  return (
    <MistLayer
      config={config}
      tint={tint}
      wind={wind}
      preferences={preferences}
      active={active}
      reducedMotion={reducedMotion}
    />
  );
}

// ─── MistSystem — main export ────────────────────────────────────────────────
export function MistSystem({
  state,
  quality,
  wind,
  preferences,
  active,
  reducedMotion,
}: {
  state: EnvironmentState;
  quality: EnvironmentQuality;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
  reducedMotion: boolean;
}) {
  const { scene } = useThree();
  const prevFog = useRef<THREE.Fog | THREE.FogExp2 | null>(null);
  const mistFog = useRef<THREE.Fog | THREE.FogExp2 | null>(null);

  const tint = useMemo(() => getMistTintForState(state), [state]);

  const dev = typeof window !== "undefined" ? (window as any).__DEV_LAB__ || {} : {};
  const enableFog = dev.mistSceneFog ?? true;
  const showFar = dev.mistFarHaze ?? true;
  const showMid = dev.mistMiddle ?? true;
  const showGround = dev.mistGround ?? true;
  const showFore = dev.mistFore ?? true;

  // Install mist-specific scene fog, restore on unmount / preset change
  useEffect(() => {
    prevFog.current = scene.fog;

    if (enableFog) {
      // Calculate a density based on fogFar. Roughly 2.0 / fogFar gives a good exponential curve
      const baseDensity = 1.8 / (state.fogFar ?? 20);
      const fog = new THREE.FogExp2(state.fogColor, baseDensity);
      mistFog.current = fog;
      scene.fog = fog;
    } else {
      scene.fog = null;
      mistFog.current = null;
    }

    return () => {
      scene.fog = prevFog.current;
      mistFog.current = null;
    };
  }, [scene, state.fogColor, state.fogNear, state.fogFar, state.preset, state.phase, enableFog]);

  // Animate fog density gently with atmosphere preference
  useFrame(() => {
    if (!mistFog.current || !active) return;
    const atmosFactor = 0.7 + (preferences.atmosphere / 100) * 0.6;
    // Gently adjust density based on atmosphere
    if (mistFog.current instanceof THREE.FogExp2) {
      const baseDensity = 1.8 / (state.fogFar ?? 20);
      mistFog.current.density = baseDensity * atmosFactor;
    }
  });

  if (!quality.particles) return null;

  const tier = quality.tier;

  // Far haze — large, very transparent, deep in scene
  const farHazeConfig: MistLayerConfig = {
    count: tier === "full" ? 12 : 6,
    xRange: [-16, 16],
    yRange: [-1, 8],
    zRange: [-22, -10],
    scaleRange: [8, 16],
    heightRange: [4, 10],
    opacityRange: [0.06, 0.18],
    driftSpeedRange: [0.02, 0.05],
    driftAmpRange: [0.8, 2.0],
    verticalDriftAmp: 0.3,
    seedOffset: 0,
  };

  // Middle mist banks — primary visible layer
  const midMistConfig: MistLayerConfig = {
    count: tier === "full" ? 16 : 8,
    xRange: [-12, 12],
    yRange: [-2, 5],
    zRange: [-10, -2],
    scaleRange: [4, 9],
    heightRange: [2, 5],
    opacityRange: [0.08, 0.24],
    driftSpeedRange: [0.05, 0.12],
    driftAmpRange: [1.0, 2.5],
    verticalDriftAmp: 0.4,
    seedOffset: 100,
  };

  // Foreground veil — very sparse, soft
  const foreVeilConfig: MistLayerConfig = {
    count: tier === "full" ? 4 : 0,
    xRange: [-8, 8],
    yRange: [0, 4],
    zRange: [-1, 2],
    scaleRange: [5, 10],
    heightRange: [3, 6],
    opacityRange: [0.03, 0.09],
    driftSpeedRange: [0.06, 0.1],
    driftAmpRange: [0.5, 1.5],
    verticalDriftAmp: 0.2,
    seedOffset: 300,
    isForeground: true,
  };

  return (
    <group>
      {/* Far atmospheric haze */}
      {showFar && <MistLayer config={farHazeConfig} tint={tint} wind={wind} preferences={preferences} active={active} reducedMotion={reducedMotion} />}

      {/* Middle drifting mist banks */}
      {showMid && <MistLayer config={midMistConfig} tint={tint} wind={wind} preferences={preferences} active={active} reducedMotion={reducedMotion} />}

      {/* Ground mist */}
      {showGround && <GroundMist tint={tint} wind={wind} preferences={preferences} active={active} reducedMotion={reducedMotion} quality={quality} />}

      {/* Foreground veil — full quality only, keep sparse to protect safe zones */}
      {tier === "full" && showFore && (
        <MistLayer config={foreVeilConfig} tint={tint} wind={wind} preferences={preferences} active={active} reducedMotion={reducedMotion} />
      )}
    </group>
  );
}
