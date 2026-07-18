"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import type { ChimeAnchorSlot } from "@/lib/wind-chime-anchors";
import { WindChimeScene } from "./WindChimeScene";

type AnchorRect = ChimeAnchorSlot & { left: number; top: number; widthPx: number; heightPx: number; visible: boolean };

function useAnchorRects(slots: ChimeAnchorSlot[]) {
  const [rects, setRects] = useState<AnchorRect[]>([]);
  useEffect(() => {
    const elements = slots
      .map((slot) => [slot, document.querySelector<HTMLElement>(`[data-chime-anchor="${slot.id}"]`)] as const)
      .filter((entry): entry is readonly [ChimeAnchorSlot, HTMLElement] => Boolean(entry[1]));
    const visible = new Map<string, boolean>();
    const refresh = () => {
      setRects(elements.map(([slot, element]) => {
        const rect = element.getBoundingClientRect();
        return { ...slot, left: rect.left, top: rect.top, widthPx: rect.width, heightPx: rect.height, visible: visible.get(slot.id) ?? true };
      }));
    };
    const resizeObserver = new ResizeObserver(refresh);
    elements.forEach(([, element]) => resizeObserver.observe(element));
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set((entry.target as HTMLElement).dataset.chimeAnchor ?? "", entry.isIntersecting));
      refresh();
    }, { threshold: 0 });
    elements.forEach(([, element]) => intersectionObserver.observe(element));
    window.addEventListener("resize", refresh, { passive: true });
    refresh();
    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("resize", refresh);
    };
  }, [slots]);
  return rects;
}

export function PublicChimeCanvas({ slots, reducedMotion }: { slots: ChimeAnchorSlot[]; reducedMotion: boolean }) {
  const rects = useAnchorRects(slots);
  const [unavailable, setUnavailable] = useState(false);
  if (unavailable || rects.length === 0) return null;

  return (
    <div className="public-chime-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0, 0, 12], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          const onContextLost = (event: Event) => {
            event.preventDefault();
            setUnavailable(true);
          };
          gl.domElement.addEventListener("webglcontextlost", onContextLost, { once: true });
        }}
      >
        <Suspense fallback={null}>
          <WindChimeScene anchors={rects.filter((rect) => rect.visible)} reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
