"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ENVIRONMENT_ARTIST_CONFIG_EVENT } from "@/components/landing/NatureAnimatedBackground";
import { useDepthEffects } from "@/hooks/useDepthEffects";
import { useEnvironmentPreferences, useResolvedEnvironmentPhase } from "@/hooks/useEnvironmentPreferences";
import { useUIPreferences } from "@/hooks/useUIPreferences";
import { audioUX } from "@/lib/audio-ux";
import { ORIANA_MEDIA_VIEWER_STATE_EVENT } from "@/lib/assistant/runtime-events";
import { getEnvironmentState } from "@/lib/environment/presets";
import { ENVIRONMENT_PRESET_IDS, type EnvironmentPresetId } from "@/lib/environment/preferences";
import { resolveEnvironmentQuality } from "@/lib/environment/quality";
import { getStoredLocale } from "@/lib/i18n";
import { getWindChimeAnchors } from "@/lib/wind-chime-anchors";
import { isChimeControlTarget, isOverlayInteractionActive, isProtectedInteractiveTarget } from "./chime-interaction";
import { EnvironmentStaticFallback } from "./EnvironmentStaticFallback";
import { useChimeAnchorRects } from "./useChimeAnchorRects";

const PublicEnvironmentCanvas = dynamic(
  () => import("./PublicEnvironmentCanvas").then((module) => module.PublicEnvironmentCanvas),
  { ssr: false },
);

function subscribeMediaViewer(callback: () => void) {
  window.addEventListener(ORIANA_MEDIA_VIEWER_STATE_EVENT, callback);
  return () => window.removeEventListener(ORIANA_MEDIA_VIEWER_STATE_EVENT, callback);
}

function getMediaViewerSnapshot() {
  return typeof document !== "undefined" && document.body.dataset.orianaMediaViewerOpen === "true";
}

function subscribeArtistConfig(callback: () => void) {
  window.addEventListener(ENVIRONMENT_ARTIST_CONFIG_EVENT, callback);
  return () => window.removeEventListener(ENVIRONMENT_ARTIST_CONFIG_EVENT, callback);
}

function getArtistConfigSnapshot() {
  if (typeof document === "undefined") return "mist:true";
  return `${document.documentElement.dataset.environmentArtistPreset ?? "mist"}:${document.documentElement.dataset.environmentEnabled ?? "true"}`;
}

function subscribeRuntimeCapability(callback: () => void) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } };
  window.addEventListener("resize", callback, { passive: true });
  document.addEventListener("visibilitychange", callback);
  motion.addEventListener("change", callback);
  connection.connection?.addEventListener("change", callback);
  return () => {
    window.removeEventListener("resize", callback);
    document.removeEventListener("visibilitychange", callback);
    motion.removeEventListener("change", callback);
    connection.connection?.removeEventListener("change", callback);
  };
}

function getRuntimeCapabilitySnapshot() {
  if (typeof window === "undefined") return "1280:false:false:true";
  const connection = navigator as Navigator & { connection?: { saveData?: boolean } };
  return `${window.innerWidth}:${window.matchMedia("(prefers-reduced-motion: reduce)").matches}:${Boolean(connection.connection?.saveData)}:${!document.hidden}`;
}

function subscribeLocale() {
  return () => {};
}

function getChimeControlRect(rect: ReturnType<typeof useChimeAnchorRects>[number]) {
  const width = Math.min(112, rect.widthPx * .56);
  const height = Math.min(158, rect.heightPx * .72);
  return { left: rect.left + (rect.widthPx - width) / 2, top: rect.top + 12, width, height };
}

function hitChime(rects: ReturnType<typeof useChimeAnchorRects>, x: number, y: number) {
  return rects.find((rect) => {
    const control = getChimeControlRect(rect);
    return x >= control.left && x <= control.left + control.width && y >= control.top && y <= control.top + control.height;
  });
}

function toDocumentPoint(event: PointerEvent) {
  return { x: event.clientX, y: event.clientY + window.scrollY };
}

function normalizeArtistPreset(value: string): EnvironmentPresetId {
  const preset = value.split(":")[0] as EnvironmentPresetId;
  return ENVIRONMENT_PRESET_IDS.includes(preset) ? preset : "mist";
}

function isEnvironmentRoute(pathname: string) {
  return pathname === "/"
    || pathname === "/albums"
    || pathname.startsWith("/albums/")
    || pathname === "/about"
    || pathname === "/contact"
    || pathname === "/games"
    || pathname === "/profile";
}

function PublicDepthEnvironmentContent({ pathname }: { pathname: string }) {
  const activeRectsRef = useRef<ReturnType<typeof useChimeAnchorRects>>([]);
  const { mode } = useDepthEffects();
  const { preferences } = useEnvironmentPreferences();
  const { soundEnabled } = useUIPreferences();
  const phase = useResolvedEnvironmentPhase(preferences.phase);
  const artistSnapshot = useSyncExternalStore(subscribeArtistConfig, getArtistConfigSnapshot, () => "mist:true");
  const capabilitySnapshot = useSyncExternalStore(subscribeRuntimeCapability, getRuntimeCapabilitySnapshot, () => "1280:false:false:true");
  const mediaViewerOpen = useSyncExternalStore(subscribeMediaViewer, getMediaViewerSnapshot, () => false);
  const locale = useSyncExternalStore(subscribeLocale, getStoredLocale, () => "en");
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const handleWebglUnavailable = useCallback(() => setWebglUnavailable(true), []);
  const [viewportWidth, reducedMotion, saveData, documentVisible] = capabilitySnapshot.split(":");
  const artistEnabled = artistSnapshot.endsWith(":true");
  const preset = preferences.preset === "default" ? normalizeArtistPreset(artistSnapshot) : preferences.preset;
  const environmentState = getEnvironmentState(preset, phase);
  const quality = useMemo(
    () => resolveEnvironmentQuality(mode, Number(viewportWidth), saveData === "true"),
    [mode, saveData, viewportWidth],
  );
  const slots = useMemo(() => getWindChimeAnchors(pathname), [pathname]);
  const rects = useChimeAnchorRects(slots);
  const showEnvironment = artistEnabled && !mediaViewerOpen;
  const environmentRects = useMemo(
    () => showEnvironment && quality.enabled ? rects : [],
    [quality.enabled, rects, showEnvironment],
  );
  const activeRects = useMemo(() => environmentRects.filter((rect) => rect.visible), [environmentRects]);
  const chimeLabel = locale === "vi" ? "Nghe chuông gió" : "Play the wind chime";
  const canvasActive = showEnvironment && quality.enabled && documentVisible === "true" && reducedMotion !== "true";

  useEffect(() => {
    activeRectsRef.current = activeRects;
    document.documentElement.dataset.environmentPreset = preset;
  }, [activeRects, preset]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const canvas = document.createElement("canvas");
        const supported = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
        if (!supported) handleWebglUnavailable();
      } catch {
        handleWebglUnavailable();
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [handleWebglUnavailable]);

  useEffect(() => {
    if (!showEnvironment || !quality.enabled) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let hoveredId: string | undefined;
    let previousX = 0;
    let previousY = 0;
    const canUseChime = (event: PointerEvent) => {
      if (!finePointer.matches || isOverlayInteractionActive()) return false;
      return isChimeControlTarget(event.target) || !isProtectedInteractiveTarget(event.target);
    };
    const onPointerMove = (event: PointerEvent) => {
      const velocityX = Math.max(-1, Math.min(1, (event.clientX - previousX) / 42));
      const velocityY = Math.max(-1, Math.min(1, (event.clientY - previousY) / 42));
      previousX = event.clientX;
      previousY = event.clientY;
      window.dispatchEvent(new CustomEvent("oriana-environment-wind-impulse", { detail: { x: velocityX * .035, y: velocityY * .02 } }));
      if (!canUseChime(event)) return;
      const point = toDocumentPoint(event);
      const chime = hitChime(activeRectsRef.current, point.x, point.y);
      if (!chime) {
        hoveredId = undefined;
        return;
      }
      const entering = hoveredId !== chime.id;
      hoveredId = chime.id;
      if (entering || Math.abs(velocityX) + Math.abs(velocityY) > .12) {
        window.dispatchEvent(new CustomEvent("oriana-chime-hover", { detail: { slotId: chime.id, x: event.clientX, y: event.clientY, velocityX, velocityY, entering } }));
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!canUseChime(event)) return;
      const point = toDocumentPoint(event);
      const chime = hitChime(activeRectsRef.current, point.x, point.y);
      if (chime) window.dispatchEvent(new CustomEvent("oriana-chime-pointer", { detail: { x: event.clientX, y: event.clientY, slotId: chime.id } }));
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [quality.enabled, reducedMotion, showEnvironment]);

  return (
    <>
      {showEnvironment ? <EnvironmentStaticFallback state={environmentState} brightness={preferences.brightness} /> : null}
      {showEnvironment ? (
        <div className="public-depth-environment" aria-hidden="true">
          <div className="public-depth-plane public-depth-plane--far" />
          <div className="public-depth-plane public-depth-plane--middle" />
          <div className="public-depth-plane public-depth-plane--near" />
        </div>
      ) : null}
      {activeRects.map((rect) => {
        const control = getChimeControlRect(rect);
        const pan = Math.max(-.65, Math.min(.65, (rect.left + rect.widthPx / 2) / Math.max(1, Number(viewportWidth)) * 2 - 1));
        return (
          <button
            key={rect.id}
            type="button"
            data-chime-control={rect.id}
            data-wind-chime-anchor={rect.id}
            data-audio-ux-ignore
            className="public-chime-control"
            style={{ left: `${control.left}px`, top: `${control.top}px`, width: `${control.width}px`, height: `${control.height}px` }}
            aria-label={chimeLabel}
            onClick={(event) => {
              if (soundEnabled) audioUX.playWindChimePreview({ frequency: rect.tone, pan, material: rect.material, volume: preferences.chimeVolume / 100 });
              if (event.detail === 0) window.dispatchEvent(new CustomEvent("oriana-chime-impulse", { detail: { slotId: rect.id } }));
            }}
            onDoubleClick={() => {
              if (soundEnabled) audioUX.playWindChimeHarmony({ frequency: rect.tone, pan, material: rect.material, volume: preferences.chimeVolume / 100 });
              window.dispatchEvent(new CustomEvent("oriana-chime-cascade", { detail: { slotId: rect.id } }));
            }}
          >
            <span className="sr-only">{chimeLabel}</span>
          </button>
        );
      })}
      {showEnvironment && quality.enabled && !webglUnavailable ? (
        <PublicEnvironmentCanvas
          rects={environmentRects}
          reducedMotion={reducedMotion === "true"}
          state={environmentState}
          preferences={preferences}
          quality={quality}
          active={canvasActive}
          onUnavailable={handleWebglUnavailable}
        />
      ) : null}
    </>
  );
}

export function PublicDepthEnvironment() {
  const pathname = usePathname() ?? "/";
  if (!isEnvironmentRoute(pathname)) return null;
  return <PublicDepthEnvironmentContent pathname={pathname} />;
}
