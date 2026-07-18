"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getWindChimeAnchors } from "@/lib/wind-chime-anchors";
import { useDepthEffects } from "@/hooks/useDepthEffects";
import { audioUX } from "@/lib/audio-ux";
import { ORIANA_MEDIA_VIEWER_STATE_EVENT } from "@/lib/assistant/runtime-events";
import { getStoredLocale } from "@/lib/i18n";
import { isChimeControlTarget, isOverlayInteractionActive, isProtectedInteractiveTarget } from "./chime-interaction";
import { useChimeAnchorRects } from "./useChimeAnchorRects";

const PublicChimeCanvas = dynamic(
  () => import("./PublicChimeCanvas").then((module) => module.PublicChimeCanvas),
  { ssr: false },
);

function supportsDepthEffects(mode: string) {
  if (mode === "off") return false;
  if (typeof window === "undefined") return mode !== "off";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion && mode === "auto") return false;
  if (mode === "auto") {
    const connection = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (connection.connection?.saveData) return false;
  }
  return true;
}

function subscribeDesktopChimes(callback: () => void) {
  const query = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getDesktopChimeSnapshot() {
  return typeof window !== "undefined"
    && window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches;
}

function subscribeMediaViewer(callback: () => void) {
  window.addEventListener(ORIANA_MEDIA_VIEWER_STATE_EVENT, callback);
  return () => window.removeEventListener(ORIANA_MEDIA_VIEWER_STATE_EVENT, callback);
}

function getMediaViewerSnapshot() {
  return typeof document !== "undefined" && document.body.dataset.orianaMediaViewerOpen === "true";
}

function subscribeLocale() {
  return () => {};
}

function getChimeControlRect(rect: ReturnType<typeof useChimeAnchorRects>[number]) {
  const width = Math.min(112, rect.widthPx * 0.56);
  const height = Math.min(158, rect.heightPx * 0.72);
  return {
    left: rect.left + (rect.widthPx - width) / 2,
    top: rect.top + 12,
    width,
    height,
  };
}

function hitChime(rects: ReturnType<typeof useChimeAnchorRects>, x: number, y: number) {
  return rects.find((rect) => {
    const control = getChimeControlRect(rect);
    return x >= control.left && x <= control.left + control.width && y >= control.top && y <= control.top + control.height;
  });
}

function selectVisibleChimes(rects: ReturnType<typeof useChimeAnchorRects>, enabled: boolean) {
  return enabled ? rects.filter((rect) => rect.visible) : [];
}

function PublicDepthEnvironmentContent({ pathname }: { pathname: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRectsRef = useRef<ReturnType<typeof useChimeAnchorRects>>([]);
  const { mode } = useDepthEffects();
  const [enabled, setEnabled] = useState(true);
  const desktopChimes = useSyncExternalStore(subscribeDesktopChimes, getDesktopChimeSnapshot, () => false);
  const mediaViewerOpen = useSyncExternalStore(subscribeMediaViewer, getMediaViewerSnapshot, () => false);
  const locale = useSyncExternalStore(subscribeLocale, getStoredLocale, () => "en");
  const slots = useMemo(() => getWindChimeAnchors(pathname), [pathname]);
  const rects = useChimeAnchorRects(slots);

  useEffect(() => {
    const update = () => setEnabled(supportsDepthEffects(mode));
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    update();
    motionQuery.addEventListener("change", update);
    return () => motionQuery.removeEventListener("change", update);
  }, [mode]);

  const showChimes = enabled && desktopChimes && mode !== "off" && !mediaViewerOpen;
  const activeRects = useMemo(
    () => selectVisibleChimes(rects, showChimes),
    [rects, showChimes],
  );
  const chimeLabel = locale === "vi" ? "Nghe chuông gió" : "Play the wind chime";

  useEffect(() => {
    activeRectsRef.current = activeRects;
  }, [activeRects]);

  useEffect(() => {
    if (!supportsDepthEffects(mode)) return;
    const root = rootRef.current;
    if (!root) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const shouldReduce = () => reducedMotion.matches || mode === "reduced";
    let visible = !document.hidden;
    let frame = 0;
    let hoveredId: string | undefined;
    let previousX = 0;
    let previousY = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const settle = () => Math.abs(targetX - currentX) < 0.02 && Math.abs(targetY - currentY) < 0.02;
    const render = () => {
      frame = 0;
      if (!visible || shouldReduce() || !finePointer.matches) return;
      currentX += (targetX - currentX) * 0.085;
      currentY += (targetY - currentY) * 0.085;
      root.style.setProperty("--public-depth-x", currentX.toFixed(3));
      root.style.setProperty("--public-depth-y", currentY.toFixed(3));
      if (!settle()) {
        frame = window.requestAnimationFrame(render);
      }
    };
    const requestFrame = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };
    const reset = () => {
      targetX = 0;
      targetY = 0;
      hoveredId = undefined;
      requestFrame();
    };
    const canUseChime = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !finePointer.matches || shouldReduce() || isOverlayInteractionActive()) return false;
      return isChimeControlTarget(event.target) || !isProtectedInteractiveTarget(event.target);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !finePointer.matches || shouldReduce()) return;
      targetX = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
      targetY = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      requestFrame();
      if (!canUseChime(event)) return;
      const chime = hitChime(activeRectsRef.current, event.clientX, event.clientY);
      if (!chime) {
        hoveredId = undefined;
        return;
      }
      const velocityX = Math.max(-1, Math.min(1, (event.clientX - previousX) / 42));
      const velocityY = Math.max(-1, Math.min(1, (event.clientY - previousY) / 42));
      const entering = hoveredId !== chime.id;
      hoveredId = chime.id;
      previousX = event.clientX;
      previousY = event.clientY;
      if (entering || Math.abs(velocityX) + Math.abs(velocityY) > 0.12) {
        window.dispatchEvent(new CustomEvent("oriana-chime-hover", {
          detail: { slotId: chime.id, x: event.clientX, y: event.clientY, velocityX, velocityY, entering },
        }));
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!canUseChime(event)) return;
      const chime = hitChime(activeRectsRef.current, event.clientX, event.clientY);
      if (!chime) return;
      window.dispatchEvent(new CustomEvent("oriana-chime-pointer", {
        detail: { x: event.clientX, y: event.clientY, slotId: chime.id },
      }));
    };
    const onVisibilityChange = () => {
      visible = !document.hidden;
      if (visible) requestFrame();
    };
    const onMediaChange = () => {
      if (shouldReduce() || !finePointer.matches) reset();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", onVisibilityChange);
    finePointer.addEventListener("change", onMediaChange);
    reducedMotion.addEventListener("change", onMediaChange);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      finePointer.removeEventListener("change", onMediaChange);
      reducedMotion.removeEventListener("change", onMediaChange);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [mode]);

  if (!enabled) return null;

  return (
    <>
      <div ref={rootRef} className="public-depth-environment" aria-hidden="true">
        <div className="public-depth-plane public-depth-plane--far" aria-hidden="true" />
        <div className="public-depth-plane public-depth-plane--middle" aria-hidden="true" />
        <div className="public-depth-plane public-depth-plane--near" aria-hidden="true" />
      </div>
      {activeRects.map((rect) => {
        const control = getChimeControlRect(rect);
        const pan = Math.max(-0.65, Math.min(0.65, (rect.left + rect.widthPx / 2) / window.innerWidth * 2 - 1));
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
              audioUX.playWindChimePreview({ frequency: rect.tone, pan });
              if (event.detail !== 0) return;
              window.dispatchEvent(new CustomEvent("oriana-chime-impulse", { detail: { slotId: rect.id } }));
            }}
            onDoubleClick={() => {
              audioUX.playWindChimeHarmony({ frequency: rect.tone, pan });
              window.dispatchEvent(new CustomEvent("oriana-chime-cascade", { detail: { slotId: rect.id } }));
            }}
          >
            <span className="sr-only">{chimeLabel}</span>
          </button>
        );
      })}
      {showChimes ? <PublicChimeCanvas rects={activeRects} reducedMotion={mode === "reduced"} /> : null}
    </>
  );
}

export function PublicDepthEnvironment() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/studio")) return null;
  return <PublicDepthEnvironmentContent pathname={pathname} />;
}
