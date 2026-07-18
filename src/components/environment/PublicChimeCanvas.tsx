"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { ChimeAnchorRect } from "@/lib/wind-chime-anchors";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import { EnvironmentScene } from "./EnvironmentScene";

export function PublicChimeCanvas({
  rects,
  reducedMotion,
  state,
  preferences,
  quality,
  active,
  onUnavailable,
}: {
  rects: ChimeAnchorRect[];
  reducedMotion: boolean;
  state: EnvironmentState;
  preferences: EnvironmentPreferences;
  quality: EnvironmentQuality;
  active: boolean;
  onUnavailable?: () => void;
}) {
  const [unavailable, setUnavailable] = useState(false);
  const contextLossCleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => contextLossCleanup.current?.(), []);

  const handleCreated = useCallback(({ gl }: { gl: { domElement: HTMLCanvasElement } }) => {
    contextLossCleanup.current?.();
    const onContextLost = () => {
      setUnavailable(true);
      onUnavailable?.();
    };
    gl.domElement.addEventListener("webglcontextlost", onContextLost, { once: true });
    contextLossCleanup.current = () => gl.domElement.removeEventListener("webglcontextlost", onContextLost);
  }, [onUnavailable]);

  if (unavailable) return null;

  return (
    <div className="public-chime-canvas" aria-hidden="true">
      <Canvas
        dpr={quality.dpr}
        frameloop={active && !reducedMotion ? "always" : "demand"}
        camera={{ position: [0, 0, 12], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={handleCreated}
      >
        <Suspense fallback={null}>
          <EnvironmentScene
            anchors={rects}
            reducedMotion={reducedMotion}
            state={state}
            preferences={preferences}
            quality={quality}
            active={active}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
