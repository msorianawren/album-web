"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ChimeAnchorRect, WindChimeMaterial } from "@/lib/wind-chime-anchors";
import { CHIME_MATERIALS } from "@/lib/environment/chime-materials";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import { automaticChimeRate, type WindRuntime } from "@/lib/environment/wind";
import {
  advanceWindChime,
  applyWindChimeImpulse,
  createWindChimeState,
  type WindChimeState,
} from "@/lib/wind-chime-physics";
import { audioUX } from "@/lib/audio-ux";
import { useUIPreferences } from "@/hooks/useUIPreferences";

type ModelRefs = { group: THREE.Group; tubes: THREE.Group[] };
type TubeMesh = { mesh: THREE.Object3D; slotId: string; tubeIndex: number };

function setWorldPosition(target: THREE.Vector3, anchor: ChimeAnchorRect, scrollY: number, size: { width: number; height: number }, viewport: { width: number; height: number }) {
  const x = ((anchor.left + anchor.widthPx / 2) / size.width - 0.5) * viewport.width;
  const y = (0.5 - (anchor.top - scrollY + anchor.heightPx / 2) / size.height) * viewport.height;
  target.set(x, y, anchor.depth);
  return target;
}

const tubeGeometries = new Map<number, THREE.CylinderGeometry>();
const tubeInteriorGeometries = new Map<number, THREE.CylinderGeometry>();
const tubeRims = new Map<number, THREE.TorusGeometry>();
const metalMaterials = Object.fromEntries(Object.entries(CHIME_MATERIALS).map(([material, profile]) => [
  material,
  [
    new THREE.MeshStandardMaterial({ color: profile.color, metalness: profile.metalness, roughness: profile.roughness }),
    new THREE.MeshStandardMaterial({ color: profile.secondary, metalness: profile.metalness, roughness: Math.min(1, profile.roughness + .07) }),
  ],
])) as Record<WindChimeMaterial, THREE.MeshStandardMaterial[]>;
const interiorMaterial = new THREE.MeshStandardMaterial({ color: "#6e7373", metalness: 0.7, roughness: 0.4, side: THREE.BackSide });
const supportMaterial = new THREE.MeshStandardMaterial({ color: "#d6c7ad", roughness: 0.26, metalness: 0.82 });
const clapperMaterial = new THREE.MeshStandardMaterial({ color: "#dad7ce", roughness: 0.22, metalness: 0.88 });
const cordMaterial = new THREE.MeshBasicMaterial({ color: "#d8cbb5", transparent: true, opacity: 0.64 });

function getTubeGeometry(length: number) {
  const key = Math.round(length * 100);
  const existing = tubeGeometries.get(key);
  if (existing) return existing;
  const geometry = new THREE.CylinderGeometry(0.052, 0.052, length, 28, 1, true);
  tubeGeometries.set(key, geometry);
  return geometry;
}

function getTubeInterior(length: number) {
  const key = Math.round(length * 100);
  const existing = tubeInteriorGeometries.get(key);
  if (existing) return existing;
  const geometry = new THREE.CylinderGeometry(0.041, 0.041, length, 28, 1, true);
  tubeInteriorGeometries.set(key, geometry);
  return geometry;
}

function getTubeRim(length: number) {
  const key = Math.round(length * 100);
  const existing = tubeRims.get(key);
  if (existing) return existing;
  const geometry = new THREE.TorusGeometry(0.047, 0.005, 7, 28);
  geometry.rotateX(Math.PI / 2);
  tubeRims.set(key, geometry);
  return geometry;
}

function ChimeModel({
  anchor,
  position,
  onReady,
  registerTube,
}: {
  anchor: ChimeAnchorRect;
  position: THREE.Vector3;
  onReady: (slotId: string, refs: ModelRefs) => void;
  registerTube: (mesh: THREE.Object3D | null, slotId: string, tubeIndex: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const tubes = useRef<THREE.Group[]>([]);
  const tubeCount = anchor.tubeCount;
  const lengths = useMemo(() => Array.from({ length: tubeCount }, (_, index) => 1.04 + (tubeCount - index) * 0.095), [tubeCount]);

  useEffect(() => {
    if (group.current) onReady(anchor.id, { group: group.current, tubes: tubes.current });
  }, [anchor.id, onReady]);

  return (
    <group ref={group} visible={anchor.visible} position={position} scale={anchor.scale} rotation={[0, anchor.side === "left" ? 0.16 : -0.16, 0]}>
      <mesh position={[0, 0.075, 0]} material={supportMaterial} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.032, 32]} />
      </mesh>
      <mesh position={[0, 0.098, 0]} material={supportMaterial} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.29, 0.009, 8, 32]} />
      </mesh>
      {lengths.map((length, index) => {
        const angle = index / tubeCount * Math.PI * 2;
        const radius = 0.24;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <group key={`${anchor.id}-${index}`} ref={(node: THREE.Group | null) => { if (node) tubes.current[index] = node; }} position={[x, -0.01, z]}>
            <mesh position={[0, -length * 0.33, 0]} material={cordMaterial}>
              <cylinderGeometry args={[0.006, 0.006, length * 0.66, 6]} />
            </mesh>
            <group position={[0, -length * 0.72, 0]}>
              <mesh
                geometry={getTubeGeometry(length)}
                material={metalMaterials[anchor.material][index % metalMaterials[anchor.material].length]}
                castShadow
                onUpdate={(mesh: THREE.Mesh) => { mesh.userData = { slotId: anchor.id, tubeIndex: index }; }}
                ref={(mesh: THREE.Mesh | null) => registerTube(mesh, anchor.id, index)}
              />
              <mesh geometry={getTubeInterior(length)} material={interiorMaterial} />
              <mesh geometry={getTubeRim(length)} material={metalMaterials[anchor.material][index % metalMaterials[anchor.material].length]} position={[0, length / 2, 0]} />
              <mesh geometry={getTubeRim(length)} material={metalMaterials[anchor.material][index % metalMaterials[anchor.material].length]} position={[0, -length / 2, 0]} />
            </group>
          </group>
        );
      })}
      <mesh position={[0, -0.76, 0]} material={clapperMaterial} castShadow>
        <sphereGeometry args={[0.068, 18, 14]} />
      </mesh>
      <mesh position={[0, -1.3, 0]} material={cordMaterial}>
        <cylinderGeometry args={[0.006, 0.006, 0.94, 6]} />
      </mesh>
      <mesh position={[0, -1.8, 0]} material={clapperMaterial} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.12, 0.28, 0.026]} />
      </mesh>
    </group>
  );
}

export function WindChimeScene({
  anchors,
  reducedMotion,
  wind,
  preferences,
  state,
  active,
}: {
  anchors: ChimeAnchorRect[];
  reducedMotion: boolean;
  wind: React.MutableRefObject<WindRuntime>;
  preferences: EnvironmentPreferences;
  state: EnvironmentState;
  active: boolean;
}) {
  const { camera, size, viewport, invalidate } = useThree();
  const { soundEnabled } = useUIPreferences();
  const physical = useRef(new Map<string, WindChimeState>());
  const models = useRef(new Map<string, ModelRefs>());
  const tubes = useRef<TubeMesh[]>([]);
  const raycaster = useRef(new THREE.Raycaster());
  const scrollY = useRef(typeof window === "undefined" ? 0 : window.scrollY);
  const [initialScrollY] = useState(() => typeof window === "undefined" ? 0 : window.scrollY);
  const windAccumulator = useRef(0);
  const nextAutomaticImpact = useRef(2.5);
  const visibleAnchors = useMemo(() => anchors.filter((anchor) => anchor.visible), [anchors]);

  useEffect(() => {
    Object.entries(metalMaterials).forEach(([material, materials]) => {
      const profile = CHIME_MATERIALS[material as WindChimeMaterial];
      materials.forEach((surface, index) => {
        surface.metalness = THREE.MathUtils.clamp(profile.metalness * state.chimeReflection, .15, 1);
        surface.roughness = THREE.MathUtils.clamp(
          profile.roughness + index * .07 - (state.chimeReflection - 1) * .12,
          .12,
          .88,
        );
      });
    });
  }, [state.chimeReflection]);

  useEffect(() => {
    const activeIds = new Set(anchors.map((anchor) => anchor.id));
    anchors.forEach((anchor) => {
      if (!physical.current.has(anchor.id)) physical.current.set(anchor.id, createWindChimeState(anchor.tubeCount));
    });
    physical.current.forEach((_, id) => {
      if (!activeIds.has(id)) {
        physical.current.delete(id);
        models.current.delete(id);
      }
    });
  }, [anchors]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        scrollY.current = window.scrollY;
        invalidate();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [invalidate]);

  const impulse = useCallback((slotId: string, tubeIndex = 0, forceX = 0.55, forceY = 0.28) => {
    const state = physical.current.get(slotId);
    if (!state) return;
    applyWindChimeImpulse(state, tubeIndex, forceX, forceY, reducedMotion ? 0.22 : 1);
    invalidate();
  }, [invalidate, reducedMotion]);

  useEffect(() => {
    const onPointer = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number; slotId: string }>).detail;
      if (!detail) return;
      const pointer = new THREE.Vector2(detail.x / size.width * 2 - 1, -(detail.y / size.height) * 2 + 1);
      raycaster.current.setFromCamera(pointer, camera);
      const intersections = raycaster.current.intersectObjects(tubes.current.map((tube) => tube.mesh), false);
      const hit = intersections[0]?.object;
      const slotId = hit?.userData.slotId ?? detail.slotId;
      const tubeIndex = hit?.userData.tubeIndex ?? 0;
      const direction = raycaster.current.ray.direction;
      impulse(slotId, tubeIndex, direction.x * 0.9 || 0.45, -direction.y * 0.45 || 0.2);
      const state = physical.current.get(slotId);
      if (state && state.tubes.length > 1) {
        impulse(slotId, (tubeIndex + 1) % state.tubes.length, direction.x * .28 || .14, -direction.y * .14 || .08);
        impulse(slotId, (tubeIndex + state.tubes.length - 1) % state.tubes.length, direction.x * .2 || .1, -direction.y * .1 || .06);
      }
    };
    const onKeyboard = (event: Event) => {
      const detail = (event as CustomEvent<{ slotId: string }>).detail;
      if (detail?.slotId) impulse(detail.slotId, 0, 0.42, 0.2);
    };
    const onHover = (event: Event) => {
      const detail = (event as CustomEvent<{ slotId: string; velocityX: number; velocityY: number; entering: boolean }>).detail;
      if (!detail?.slotId || reducedMotion) return;
      const forceX = detail.entering ? 0.13 : detail.velocityX * 0.12;
      const forceY = detail.entering ? 0.06 : detail.velocityY * 0.08;
      if (Math.abs(forceX) + Math.abs(forceY) > 0.03) impulse(detail.slotId, 0, forceX, forceY);
    };
    const onCascade = (event: Event) => {
      const detail = (event as CustomEvent<{ slotId: string }>).detail;
      const state = detail?.slotId ? physical.current.get(detail.slotId) : null;
      if (!state || !detail?.slotId) return;
      state.tubes.forEach((_, index) => impulse(detail.slotId, index, 0.42 - index * 0.035, 0.2));
    };
    window.addEventListener("oriana-chime-pointer", onPointer);
    window.addEventListener("oriana-chime-impulse", onKeyboard);
    window.addEventListener("oriana-chime-hover", onHover);
    window.addEventListener("oriana-chime-cascade", onCascade);
    return () => {
      window.removeEventListener("oriana-chime-pointer", onPointer);
      window.removeEventListener("oriana-chime-impulse", onKeyboard);
      window.removeEventListener("oriana-chime-hover", onHover);
      window.removeEventListener("oriana-chime-cascade", onCascade);
    };
  }, [camera, impulse, reducedMotion, size.height, size.width]);

  useFrame(({ clock }, delta) => {
    let moving = false;
    anchors.forEach((anchor) => {
      const model = models.current.get(anchor.id);
      if (model) setWorldPosition(model.group.position, anchor, scrollY.current, size, viewport);
    });
    if (active && !reducedMotion) {
      windAccumulator.current += delta;
      if (windAccumulator.current >= .18) {
        windAccumulator.current = 0;
        const field = wind.current.current;
        visibleAnchors.forEach((anchor, index) => {
          if (field.strength > .08) impulse(anchor.id, index % anchor.tubeCount, field.x * .075, field.y * .04 + field.gust * .025);
        });
      }
      const autoRate = automaticChimeRate(preferences.windSpeed * state.wind, preferences.autoChimeFrequency);
      if (autoRate > 0 && clock.elapsedTime >= nextAutomaticImpact.current) {
        const index = Math.floor(clock.elapsedTime * 1.7) % Math.max(visibleAnchors.length, 1);
        const anchor = visibleAnchors[index];
        if (anchor) impulse(anchor.id, Math.floor(clock.elapsedTime * 2.3) % anchor.tubeCount, .18 + wind.current.current.gust * .22, .07);
        nextAutomaticImpact.current = clock.elapsedTime + Math.max(2.8, 15 - autoRate * 11);
      }
    }
    physical.current.forEach((state, slotId) => {
      const impacts = advanceWindChime(state, reducedMotion ? Math.min(delta, 1 / 120) : delta);
      const model = models.current.get(slotId);
      if (model) {
        model.group.rotation.x = state.clapper.angleX * 0.18;
        model.group.rotation.z = state.clapper.angleY * 0.18;
        state.tubes.forEach((tube, index) => {
          const tubeGroup = model.tubes[index];
          if (!tubeGroup) return;
          tubeGroup.rotation.x = tube.angleX;
          tubeGroup.rotation.z = tube.angleY;
        });
      }
      impacts.forEach((impact) => {
        if (soundEnabled) {
          const anchor = anchors.find((candidate) => candidate.id === slotId);
          const pan = anchor ? Math.max(-0.85, Math.min(0.85, (anchor.left + anchor.widthPx / 2) / size.width * 2 - 1)) : 0;
          audioUX.playWindChimeImpact({
            tubeId: `${slotId}-${impact.tubeIndex}`,
            frequency: (anchor?.tone ?? 587.33) * (1 + impact.tubeIndex * .062),
            velocity: impact.velocity,
            pan,
            material: anchor?.material ?? "silver",
            volume: preferences.chimeVolume / 100,
          });
        }
      });
      moving ||= !state.sleeping;
    });
    if (moving) invalidate();
  });

  const positions = useMemo(() => anchors.map((anchor) => ({
    anchor,
    position: setWorldPosition(new THREE.Vector3(), anchor, initialScrollY, size, viewport),
  })), [anchors, initialScrollY, size, viewport]);

  return (
    <>
      {positions.map(({ anchor, position }) => (
        <ChimeModel
          key={anchor.id}
          anchor={anchor}
          position={position}
          onReady={(slotId, refs) => models.current.set(slotId, refs)}
          registerTube={(mesh, slotId, tubeIndex) => {
            tubes.current = tubes.current.filter((item) => !(item.slotId === slotId && item.tubeIndex === tubeIndex));
            if (mesh) tubes.current.push({ mesh, slotId, tubeIndex });
          }}
        />
      ))}
    </>
  );
}
