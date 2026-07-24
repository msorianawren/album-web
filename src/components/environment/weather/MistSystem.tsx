"use client";

import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { createSeededRandom } from "@/lib/environment/deterministic-random";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { WindRuntime } from "@/lib/environment/wind";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import { MistShaderMaterial } from "./mist-shader";
import { getEnvironmentDevLabState } from "@/lib/environment/dev-lab";

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
  const materialRef = useRef<MistShaderMaterial | null>(null);
  const geom = useMemo(() => getMistPlaneGeom().clone(), []);

  const mat = useMemo(() => new MistShaderMaterial(tint), [tint]);
  const count = reducedMotion ? Math.max(2, Math.floor(config.count * 0.3)) : config.count;
  const [xMin, xMax] = config.xRange;
  const [yMin, yMax] = config.yRange;
  const [zMin, zMax] = config.zRange;
  const [scaleMin, scaleMax] = config.scaleRange;
  const [heightMin, heightMax] = config.heightRange;
  const [opacityMin, opacityMax] = config.opacityRange;
  const [driftSpeedMin, driftSpeedMax] = config.driftSpeedRange;
  const [driftAmpMin, driftAmpMax] = config.driftAmpRange;
  const isForeground = config.isForeground ?? false;
  const stableConfig = useMemo(() => ({
    xRange: [xMin, xMax] as [number, number],
    yRange: [yMin, yMax] as [number, number],
    zRange: [zMin, zMax] as [number, number],
    scaleRange: [scaleMin, scaleMax] as [number, number],
    heightRange: [heightMin, heightMax] as [number, number],
    opacityRange: [opacityMin, opacityMax] as [number, number],
    driftSpeedRange: [driftSpeedMin, driftSpeedMax] as [number, number],
    driftAmpRange: [driftAmpMin, driftAmpMax] as [number, number],
    verticalDriftAmp: config.verticalDriftAmp,
    seedOffset: config.seedOffset,
    isForeground,
  }), [driftAmpMax, driftAmpMin, driftSpeedMax, driftSpeedMin, heightMax, heightMin, isForeground, opacityMax, opacityMin, scaleMax, scaleMin, xMax, xMin, yMax, yMin, zMax, zMin, config.seedOffset, config.verticalDriftAmp]);

  const instanceData = useMemo(() => {
    const prng = createSeededRandom(stableConfig.seedOffset * 997 + 13);
    return Array.from({ length: count }, () => {
      let x = prng.range(stableConfig.xRange[0], stableConfig.xRange[1]);
      // Explicitly push foreground veil away from the center (safe zone)
      if (stableConfig.isForeground) {
        if (x > -3 && x < 3) {
          x = x < 0 ? x - 4 : x + 4;
        }
      }
      return {
        x,
        y: prng.range(stableConfig.yRange[0], stableConfig.yRange[1]),
        z: prng.range(stableConfig.zRange[0], stableConfig.zRange[1]),
        scaleX: prng.range(stableConfig.scaleRange[0], stableConfig.scaleRange[1]),
        scaleY: prng.range(stableConfig.heightRange[0], stableConfig.heightRange[1]),
        opacity: prng.range(stableConfig.opacityRange[0], stableConfig.opacityRange[1]),
        driftSpeed: prng.range(stableConfig.driftSpeedRange[0], stableConfig.driftSpeedRange[1]),
        driftAmp: prng.range(stableConfig.driftAmpRange[0], stableConfig.driftAmpRange[1]),
        vertPhase: prng.range(0, Math.PI * 2),
        driftPhase: prng.range(0, Math.PI * 2),
        rotY: prng.range(-Math.PI * 0.15, Math.PI * 0.15), // Face the camera
        seed: prng.value(),
      };
    });
  }, [count, stableConfig]);

  useEffect(() => {
    materialRef.current = mat;
    return () => {
      if (materialRef.current === mat) materialRef.current = null;
    };
  }, [mat]);

  // Set initial matrices and attributes
  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    
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
  }, [count, geom, instanceData]);

  useFrame(({ clock }) => {
    if (!mesh.current || !active) return;
    const time = clock.elapsedTime;
    const dummy = new THREE.Object3D();
    
    // Check dev toggles dynamically (without reacting to re-renders)
    const devLab = getEnvironmentDevLabState();
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
        : Math.sin(time * 0.18 + d.vertPhase) * stableConfig.verticalDriftAmp;

      dummy.position.set(d.x + drift, d.y + vertDrift, d.z);
      dummy.rotation.y = d.rotY + time * 0.008 * d.driftSpeed;
      dummy.scale.set(d.scaleX, d.scaleY, 1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;

    // Update uniforms
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = time;
    material.uniforms.uOpacity.value = atmosFactor * (devLab.mistOpacityMultiplier ?? 1.0);
    material.uniforms.uSpeed.value = devLab.mistMotionSpeed ?? 1.0;
    material.uniforms.uEdgeDebug.value = devLab.mistEdgeDebug ? 1.0 : 0.0;
    material.uniforms.uContrast.value = devLab.mistNoiseContrast ?? 1.2;
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
  const tint = useMemo(() => getMistTintForState(state), [state]);
  const dev = getEnvironmentDevLabState();
  const enableFog = dev.mistSceneFog ?? true;
  const showFar = dev.mistFarHaze ?? true;
  const showMid = dev.mistMiddle ?? true;
  const showGround = dev.mistGround ?? true;
  const showFore = dev.mistFore ?? true;

  const fogDensity = enableFog && active
    ? (1.8 / (state.fogFar ?? 20)) * (0.7 + (preferences.atmosphere / 100) * 0.6)
    : 0;

  if (!quality.particles) return null;

  const tier = quality.tier;

  // Far haze — large, very transparent, deep in scene
  const farHazeConfig: MistLayerConfig = {
    count: tier === "full" ? 24 : 12,
    xRange: [-16, 16],
    yRange: [-1, 8],
    zRange: [-22, -10],
    scaleRange: [8, 16],
    heightRange: [4, 10],
    opacityRange: [0.3, 0.6],
    driftSpeedRange: [0.02, 0.05],
    driftAmpRange: [0.8, 2.0],
    verticalDriftAmp: 0.3,
    seedOffset: 0,
  };

  // Middle mist banks — primary visible layer
  const midMistConfig: MistLayerConfig = {
    count: tier === "full" ? 32 : 16,
    xRange: [-12, 12],
    yRange: [-2, 5],
    zRange: [-10, -2],
    scaleRange: [4, 9],
    heightRange: [2, 5],
    opacityRange: [0.4, 0.7],
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
    zRange: [-2, 2],
    scaleRange: [2, 5],
    heightRange: [1, 3],
    opacityRange: [0.15, 0.3],
    driftSpeedRange: [0.06, 0.1],
    driftAmpRange: [0.5, 1.5],
    verticalDriftAmp: 0.2,
    seedOffset: 300,
    isForeground: true,
  };

  return (
    <group>
      {enableFog ? <fogExp2 attach="fog" args={[state.fogColor, fogDensity]} /> : null}
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
