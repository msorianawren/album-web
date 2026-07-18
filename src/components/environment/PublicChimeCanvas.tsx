"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { ChimeAnchorRect } from "@/lib/wind-chime-anchors";
import { WindChimeScene } from "./WindChimeScene";

export function PublicChimeCanvas({ rects, reducedMotion }: { rects: ChimeAnchorRect[]; reducedMotion: boolean }) {
  const [unavailable, setUnavailable] = useState(false);
  const contextLossCleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => contextLossCleanup.current?.(), []);

  const handleCreated = useCallback(({ gl }: { gl: { domElement: HTMLCanvasElement } }) => {
    contextLossCleanup.current?.();
    const onContextLost = () => setUnavailable(true);
    gl.domElement.addEventListener("webglcontextlost", onContextLost, { once: true });
    contextLossCleanup.current = () => gl.domElement.removeEventListener("webglcontextlost", onContextLost);
  }, []);

  if (unavailable || rects.length === 0) return null;

  return (
    <div className="public-chime-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0, 0, 12], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={handleCreated}
      >
        <Suspense fallback={null}>
          <WindChimeScene anchors={rects.filter((rect) => rect.visible)} reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
