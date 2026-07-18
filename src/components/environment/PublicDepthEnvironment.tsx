"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getWindChimeAnchors } from "@/lib/wind-chime-anchors";
import { useDepthEffects } from "@/hooks/useDepthEffects";
import { ORIANA_MEDIA_VIEWER_STATE_EVENT } from "@/lib/assistant/runtime-events";
import { getStoredLocale } from "@/lib/i18n";

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

export function PublicDepthEnvironment() {
  const pathname = usePathname() ?? "/";
  const rootRef = useRef<HTMLDivElement>(null);
  const { mode } = useDepthEffects();
  const [enabled, setEnabled] = useState(true);
  const desktopChimes = useSyncExternalStore(subscribeDesktopChimes, getDesktopChimeSnapshot, () => false);
  const mediaViewerOpen = useSyncExternalStore(subscribeMediaViewer, getMediaViewerSnapshot, () => false);
  const locale = useSyncExternalStore(subscribeLocale, getStoredLocale, () => "en");
  const isStudio = pathname.startsWith("/studio");
  const slots = useMemo(() => getWindChimeAnchors(pathname), [pathname]);

  useEffect(() => {
    const update = () => setEnabled(supportsDepthEffects(mode));
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    update();
    motionQuery.addEventListener("change", update);
    return () => motionQuery.removeEventListener("change", update);
  }, [mode]);

  const showChimes = desktopChimes && mode !== "off" && !mediaViewerOpen;
  const chimeLabel = locale === "vi" ? "Nghe chuông gió" : "Play the wind chime";

  useEffect(() => {
    if (isStudio || !supportsDepthEffects(mode)) return;
    const root = rootRef.current;
    if (!root) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = !document.hidden;
    let frame = 0;
    let active = false;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const settle = () => Math.abs(targetX - currentX) < 0.02 && Math.abs(targetY - currentY) < 0.02;
    const render = () => {
      frame = 0;
      if (!visible || reducedMotion.matches || !finePointer.matches) return;
      currentX += (targetX - currentX) * 0.085;
      currentY += (targetY - currentY) * 0.085;
      root.style.setProperty("--public-depth-x", currentX.toFixed(3));
      root.style.setProperty("--public-depth-y", currentY.toFixed(3));
      if (!settle() || active) {
        root.style.willChange = "transform";
        frame = window.requestAnimationFrame(render);
      } else {
        root.style.willChange = "";
      }
    };
    const requestFrame = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !finePointer.matches || reducedMotion.matches) return;
      targetX = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
      targetY = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
      active = true;
      requestFrame();
    };
    const reset = () => {
      active = false;
      targetX = 0;
      targetY = 0;
      requestFrame();
    };
    const onPointerDown = (event: PointerEvent) => {
      const anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-chime-anchor]"));
      const anchor = anchors.find((element) => {
        const rect = element.getBoundingClientRect();
        return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      });
      if (!anchor) return;
      window.dispatchEvent(new CustomEvent("oriana-chime-pointer", {
        detail: { x: event.clientX, y: event.clientY, slotId: anchor.dataset.chimeAnchor },
      }));
    };
    const onVisibilityChange = () => {
      visible = !document.hidden;
      if (visible) requestFrame();
    };
    const onMediaChange = () => {
      if (reducedMotion.matches || !finePointer.matches) reset();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("blur", reset);
    document.addEventListener("pointerleave", reset);
    document.addEventListener("visibilitychange", onVisibilityChange);
    finePointer.addEventListener("change", onMediaChange);
    reducedMotion.addEventListener("change", onMediaChange);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("blur", reset);
      document.removeEventListener("pointerleave", reset);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      finePointer.removeEventListener("change", onMediaChange);
      reducedMotion.removeEventListener("change", onMediaChange);
      if (frame) window.cancelAnimationFrame(frame);
      root.style.willChange = "";
    };
  }, [isStudio, mode]);

  if (isStudio || !enabled) return null;

  return (
    <>
      <div ref={rootRef} className="public-depth-environment" aria-hidden="true">
      <div className="public-depth-plane public-depth-plane--far" aria-hidden="true" />
      <div className="public-depth-plane public-depth-plane--middle" aria-hidden="true" />
      <div className="public-depth-plane public-depth-plane--near" aria-hidden="true" />
      </div>
      {showChimes ? slots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          data-chime-anchor={slot.id}
          data-audio-ux-ignore
          className="public-chime-control"
          style={{
            left: `${slot.x}%`,
            top: `${slot.y}%`,
            width: `${slot.width}vw`,
            height: `${slot.height}vh`,
            transform: "translate(-50%, -50%)",
          }}
          aria-label={chimeLabel}
          onClick={(event) => {
            if (event.detail !== 0) return;
            window.dispatchEvent(new CustomEvent("oriana-chime-impulse", { detail: { slotId: slot.id } }));
          }}
        >
          <span className="sr-only">{chimeLabel}</span>
        </button>
      )) : null}
      {showChimes ? <PublicChimeCanvas slots={slots} reducedMotion={mode === "reduced"} /> : null}
    </>
  );
}
