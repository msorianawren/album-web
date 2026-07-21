"use client";

import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { createSeededRandom } from "@/lib/environment/deterministic-random";
import { getLeafGeometry } from "@/lib/environment/leaf-geometries";
import type { WindRuntime } from "@/lib/environment/wind";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";

interface LayerConfig {
  count: number;
  speedRange: [number, number];
  scaleRange: [number, number];
  opacity: number;
  spinMultiplier: number;
  zRange: [number, number];
}

function AutumnLeafLayer({
  layerConfig,
  colors,
  leafType,
  seedOffset,
  wind,
  preferences,
  active,
  reducedMotion,
  viewHeight,
}: {
  layerConfig: LayerConfig;
  colors: THREE.Color[];
  leafType: "maple" | "ginkgo";
  seedOffset: number;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
  reducedMotion: boolean;
  viewHeight: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geom = useMemo(() => getLeafGeometry(leafType), [leafType]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.85,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: layerConfig.opacity,
    depthWrite: false,
  }), [layerConfig.opacity]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = reducedMotion ? Math.floor(layerConfig.count * 0.3) : layerConfig.count;

  // Use full view height plus buffer so leaves cover top to bottom without disappearing
  const yTop = viewHeight * 0.5 + 2;    // just above visible top
  const yBottom = -viewHeight * 0.5 - 2; // just below visible bottom
  const range = yTop - yBottom;

  const instanceData = useMemo(() => {
    const prng = createSeededRandom(seedOffset * 1337 + 99);
    return Array.from({ length: count }, () => ({
      // Spread initial y across entire viewport so no empty top area on load
      initY: prng.range(0, range),
      x: prng.range(-18, 18),
      z: prng.range(layerConfig.zRange[0], layerConfig.zRange[1]),
      speedMult: prng.range(layerConfig.speedRange[0], layerConfig.speedRange[1]),
      rotX: prng.range(0, Math.PI * 2),
      rotY: prng.range(0, Math.PI * 2),
      rotZ: prng.range(0, Math.PI * 2),
      spinX: (prng.value() - 0.5) * layerConfig.spinMultiplier,
      spinZ: (prng.value() - 0.5) * layerConfig.spinMultiplier,
      driftFreq: prng.range(0.2, 0.6),
      driftAmp: prng.range(0.5, 1.5),
      gustPhase: prng.range(0, Math.PI * 2),
      scale: prng.range(layerConfig.scaleRange[0], layerConfig.scaleRange[1]),
      colorIndex: Math.floor(prng.range(0, colors.length)),
    }));
  }, [count, seedOffset, range, layerConfig, colors.length]);

  // Set initial instance colors once
  useEffect(() => {
    if (!mesh.current) return;
    for (let i = 0; i < count; i++) {
      mesh.current.setColorAt(i, colors[instanceData[i].colorIndex]);
    }
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [count, instanceData, colors]);

  useFrame(({ clock }) => {
    if (!active || !mesh.current) return;
    const time = clock.elapsedTime;
    const windX = wind.current.current.x;
    const gustStrength = wind.current.current.gust * (preferences.gustStrength / 100);
    const windMult = preferences.windSpeed / 100;
    const fallSpeed = 2.0;

    for (let i = 0; i < count; i++) {
      const d = instanceData[i];

      // Each leaf falls at its own speed. initY offsets so they start spread across the screen.
      // Modulo wraps them back to top when they exit bottom.
      const fallen = (d.initY + time * fallSpeed * d.speedMult) % range;
      const y = yTop - fallen;

      // Lateral drift — sine wave only (no unbounded drift)
      const gustWave = Math.sin(time * 0.65 + d.gustPhase) * gustStrength;
      const sideDrift = Math.sin(time * d.driftFreq + d.gustPhase) * d.driftAmp;
      const windPush = windX * windMult * 0.6;

      dummy.position.set(
        d.x + sideDrift + windPush,
        y,
        d.z,
      );

      // Tumbling rotation
      dummy.rotation.x = d.rotX + time * d.spinX * (1 + gustWave * 0.4);
      dummy.rotation.y = d.rotY + time * 0.35 * d.speedMult;
      dummy.rotation.z = d.rotZ + time * d.spinZ;

      const s = d.scale * (1 + gustWave * 0.04);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geom, mat, count]}
      renderOrder={2}
      frustumCulled={false}
    />
  );
}

export function AutumnLeafField({
  quality,
  wind,
  preferences,
  active,
  reducedMotion,
}: {
  quality: EnvironmentQuality;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  active: boolean;
  reducedMotion: boolean;
}) {
  const { viewport } = useThree();
  const viewHeight = viewport.height;

  const tier = quality.tier;
  const densityFactor = (preferences.particleAmount / 100) * (tier === "full" ? 1.0 : 0.35);

  const mapleColors = useMemo(() => [
    new THREE.Color("#c45b2a"),
    new THREE.Color("#e8b84b"),
    new THREE.Color("#b76d36"),
    new THREE.Color("#d92f10"),  // deep Canadian red
    new THREE.Color("#f0a830"),  // bright golden
    new THREE.Color("#8f4e35"),
  ], []);

  const ginkgoColors = useMemo(() => [
    new THREE.Color("#d4a835"),
    new THREE.Color("#e8c454"),
    new THREE.Color("#f0d06a"),
    new THREE.Color("#b8951e"),
  ], []);

  if (!quality.particles || densityFactor === 0) return null;

  const farConfig: LayerConfig = {
    count: Math.floor(350 * densityFactor),
    speedRange: [0.5, 0.8],
    scaleRange: [0.18, 0.32],
    opacity: 0.4,
    spinMultiplier: 0.5,
    zRange: [-22, -8],
  };

  const midConfig: LayerConfig = {
    count: Math.floor(250 * densityFactor),
    speedRange: [0.75, 1.15],
    scaleRange: [0.3, 0.55],
    opacity: 0.65,
    spinMultiplier: 1.0,
    zRange: [-8, 0],
  };

  const nearConfig: LayerConfig = {
    count: Math.floor(tier === "full" ? 80 : 25),
    speedRange: [1.0, 1.5],
    scaleRange: [0.45, 0.75],
    opacity: 0.55,
    spinMultiplier: 1.4,
    zRange: [0, 5],
  };

  return (
    <group>
      {/* Far — small, slow, low-contrast maples */}
      <AutumnLeafLayer
        layerConfig={farConfig}
        colors={mapleColors}
        leafType="maple"
        seedOffset={0}
        wind={wind}
        preferences={preferences}
        active={active}
        reducedMotion={reducedMotion}
        viewHeight={viewHeight}
      />
      {/* Mid — maple + ginkgo mix */}
      <AutumnLeafLayer
        layerConfig={midConfig}
        colors={[...mapleColors, ...ginkgoColors]}
        leafType="maple"
        seedOffset={50}
        wind={wind}
        preferences={preferences}
        active={active}
        reducedMotion={reducedMotion}
        viewHeight={viewHeight}
      />
      {/* Near — full quality only, larger, faster */}
      {tier === "full" && !reducedMotion && (
        <AutumnLeafLayer
          layerConfig={nearConfig}
          colors={mapleColors}
          leafType="maple"
          seedOffset={200}
          wind={wind}
          preferences={preferences}
          active={active}
          reducedMotion={reducedMotion}
          viewHeight={viewHeight}
        />
      )}
      {/* Ginkgo accent layer — mid depth */}
      {tier === "full" && (
        <AutumnLeafLayer
          layerConfig={{ ...midConfig, count: Math.floor(80 * densityFactor), scaleRange: [0.25, 0.5], opacity: 0.5 }}
          colors={ginkgoColors}
          leafType="ginkgo"
          seedOffset={300}
          wind={wind}
          preferences={preferences}
          active={active}
          reducedMotion={reducedMotion}
          viewHeight={viewHeight}
        />
      )}
    </group>
  );
}
