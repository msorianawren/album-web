"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ChimeAnchorRect, WindChimeMaterial } from "@/lib/wind-chime-anchors";
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

const tubeGeometries = new Map<number, THREE.CylinderGeometry>();
const tubeInteriorGeometries = new Map<number, THREE.CylinderGeometry>();
const tubeRims = new Map<number, THREE.TorusGeometry>();
const metalMaterials: Record<WindChimeMaterial, THREE.MeshStandardMaterial[]> = {
  silver: [
    new THREE.MeshStandardMaterial({ color: "#ece9df", metalness: 0.9, roughness: 0.22 }),
    new THREE.MeshStandardMaterial({ color: "#b9c1c4", metalness: 0.86, roughness: 0.27 }),
  ],
  champagne: [
    new THREE.MeshStandardMaterial({ color: "#e6d8bc", metalness: 0.84, roughness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: "#c7af82", metalness: 0.8, roughness: 0.3 }),
  ],
  bronze: [
    new THREE.MeshStandardMaterial({ color: "#d8c4a4", metalness: 0.78, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: "#ad9677", metalness: 0.74, roughness: 0.34 }),
  ],
};
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
    <group ref={group} position={position} scale={anchor.scale} rotation={[0, anchor.side === "left" ? 0.16 : -0.16, 0]}>
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

export function WindChimeScene({ anchors, reducedMotion }: { anchors: ChimeAnchorRect[]; reducedMotion: boolean }) {
  const { camera, size, viewport, invalidate } = useThree();
  const { soundEnabled } = useUIPreferences();
  const physical = useRef(new Map<string, WindChimeState>());
  const models = useRef(new Map<string, ModelRefs>());
  const tubes = useRef<TubeMesh[]>([]);
  const raycaster = useRef(new THREE.Raycaster());

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
    window.addEventListener("oriana-chime-pointer", onPointer);
    window.addEventListener("oriana-chime-impulse", onKeyboard);
    window.addEventListener("oriana-chime-hover", onHover);
    return () => {
      window.removeEventListener("oriana-chime-pointer", onPointer);
      window.removeEventListener("oriana-chime-impulse", onKeyboard);
      window.removeEventListener("oriana-chime-hover", onHover);
    };
  }, [camera, impulse, reducedMotion, size.height, size.width]);

  useFrame((_, delta) => {
    let moving = false;
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
          audioUX.playWindChimeImpact({ tubeId: `${slotId}-${impact.tubeIndex}`, frequency: (anchor?.tone ?? 587.33) * (1 + impact.tubeIndex * 0.062), velocity: impact.velocity, pan });
        }
      });
      moving ||= !state.sleeping;
    });
    if (moving) invalidate();
  });

  const positions = useMemo(() => anchors.map((anchor) => {
    const x = ((anchor.left + anchor.widthPx / 2) / size.width - 0.5) * viewport.width;
    const y = (0.5 - (anchor.top + anchor.heightPx / 2) / size.height) * viewport.height;
    return { anchor, position: new THREE.Vector3(x, y, anchor.depth) };
  }), [anchors, size.height, size.width, viewport.height, viewport.width]);

  return (
    <>
      <hemisphereLight args={["#fff7e8", "#4b3e35", 1.05]} />
      <directionalLight position={[3.5, 5.5, 6]} intensity={2.1} color="#fff1d8" />
      <directionalLight position={[-4, 1, 4]} intensity={0.55} color="#b4c0d6" />
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
