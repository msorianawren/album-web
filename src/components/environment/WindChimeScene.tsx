"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ChimeAnchorSlot } from "@/lib/wind-chime-anchors";
import {
  advanceWindChime,
  applyWindChimeImpulse,
  createWindChimeState,
  type WindChimeState,
} from "@/lib/wind-chime-physics";
import { audioUX } from "@/lib/audio-ux";
import { useUIPreferences } from "@/hooks/useUIPreferences";

type AnchorRect = ChimeAnchorSlot & { left: number; top: number; widthPx: number; heightPx: number; visible: boolean };
type ModelRefs = { group: THREE.Group; tubes: THREE.Group[] };
type TubeMesh = { mesh: THREE.Object3D; slotId: string; tubeIndex: number };

const tubeGeometries = new Map<number, THREE.ExtrudeGeometry>();
const tubeInteriorGeometries = new Map<number, THREE.CylinderGeometry>();
const metalMaterials = [
  new THREE.MeshStandardMaterial({ color: "#c9c3ba", metalness: 0.83, roughness: 0.27 }),
  new THREE.MeshStandardMaterial({ color: "#b8a78e", metalness: 0.78, roughness: 0.32 }),
  new THREE.MeshStandardMaterial({ color: "#9e9791", metalness: 0.9, roughness: 0.25 }),
];
const interiorMaterial = new THREE.MeshStandardMaterial({ color: "#332d2a", metalness: 0.42, roughness: 0.58, side: THREE.BackSide });
const supportMaterial = new THREE.MeshStandardMaterial({ color: "#6f5845", roughness: 0.62, metalness: 0.12 });
const cordMaterial = new THREE.MeshBasicMaterial({ color: "#867a6c", transparent: true, opacity: 0.7 });

function getTubeGeometry(length: number) {
  const key = Math.round(length * 100);
  const existing = tubeGeometries.get(key);
  if (existing) return existing;
  const outer = 0.135;
  const inner = 0.097;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.009, bevelSegments: 1, curveSegments: 20 });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, -length / 2, 0);
  tubeGeometries.set(key, geometry);
  return geometry;
}

function getTubeInterior(length: number) {
  const key = Math.round(length * 100);
  const existing = tubeInteriorGeometries.get(key);
  if (existing) return existing;
  const geometry = new THREE.CylinderGeometry(0.098, 0.098, length, 20, 1, true);
  tubeInteriorGeometries.set(key, geometry);
  return geometry;
}

function ChimeModel({
  anchor,
  position,
  onReady,
  registerTube,
}: {
  anchor: AnchorRect;
  position: THREE.Vector3;
  onReady: (slotId: string, refs: ModelRefs) => void;
  registerTube: (mesh: THREE.Object3D | null, slotId: string, tubeIndex: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const tubes = useRef<THREE.Group[]>([]);
  const tubeCount = anchor.tubeCount;
  const lengths = useMemo(() => Array.from({ length: tubeCount }, (_, index) => 1.2 + (tubeCount - index) * 0.11), [tubeCount]);

  useEffect(() => {
    if (group.current) onReady(anchor.id, { group: group.current, tubes: tubes.current });
  }, [anchor.id, onReady]);

  return (
    <group ref={group} position={position} scale={0.34}>
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} material={supportMaterial} castShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.12, 28]} />
      </mesh>
      <mesh position={[0, 0.19, 0]} material={supportMaterial}>
        <sphereGeometry args={[0.075, 16, 10]} />
      </mesh>
      {lengths.map((length, index) => {
        const angle = index / tubeCount * Math.PI * 2;
        const radius = 0.42;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <group key={`${anchor.id}-${index}`} ref={(node: THREE.Group | null) => { if (node) tubes.current[index] = node; }} position={[x, -0.06, z]}>
            <mesh position={[0, -length / 2, 0]} material={cordMaterial}>
              <cylinderGeometry args={[0.009, 0.009, length * 0.65, 6]} />
            </mesh>
            <group position={[0, -length * 0.66, 0]}>
              <mesh
                geometry={getTubeGeometry(length)}
                material={metalMaterials[index % metalMaterials.length]}
                castShadow
                onUpdate={(mesh: THREE.Mesh) => { mesh.userData = { slotId: anchor.id, tubeIndex: index }; }}
                ref={(mesh: THREE.Mesh | null) => registerTube(mesh, anchor.id, index)}
              />
              <mesh geometry={getTubeInterior(length)} material={interiorMaterial} />
            </group>
          </group>
        );
      })}
      <mesh position={[0, -0.98, 0]} material={supportMaterial} castShadow>
        <sphereGeometry args={[0.16, 16, 12]} />
      </mesh>
      <mesh position={[0, -1.74, 0]} material={cordMaterial}>
        <cylinderGeometry args={[0.012, 0.012, 1.38, 6]} />
      </mesh>
      <mesh position={[0, -2.46, 0]} material={supportMaterial} rotation={[0, 0.25, 0]}>
        <coneGeometry args={[0.32, 0.56, 4]} />
      </mesh>
    </group>
  );
}

export function WindChimeScene({ anchors, reducedMotion }: { anchors: AnchorRect[]; reducedMotion: boolean }) {
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
    window.addEventListener("oriana-chime-pointer", onPointer);
    window.addEventListener("oriana-chime-impulse", onKeyboard);
    return () => {
      window.removeEventListener("oriana-chime-pointer", onPointer);
      window.removeEventListener("oriana-chime-impulse", onKeyboard);
    };
  }, [camera, impulse, size.height, size.width]);

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
    return { anchor, position: new THREE.Vector3(x, y, 0) };
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
