"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DepthSurfaceProps {
  children: ReactNode;
  className?: string;
  glare?: boolean;
  strength?: "subtle" | "gentle";
}

export function DepthSurface({
  children,
  className,
  glare = false,
  strength = "subtle",
}: DepthSurfaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const transform = transformRef.current;
    if (!root || !transform) return;

    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const maxRotation = strength === "gentle" ? 2.8 : 2.2;
    const maxTranslation = strength === "gentle" ? 5 : 3;
    let enabled = false;
    let bounds: DOMRect | null = null;
    let boundsInvalid = true;
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let willChangeTimer = 0;

    const reset = () => {
      pointer = null;
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      transform.style.setProperty("--depth-duration", "260ms");
      transform.style.setProperty("--depth-rotate-x", "0deg");
      transform.style.setProperty("--depth-rotate-y", "0deg");
      transform.style.setProperty("--depth-translate-x", "0px");
      transform.style.setProperty("--depth-translate-y", "0px");
      transform.style.setProperty("--depth-glare-x", "50%");
      transform.style.setProperty("--depth-glare-y", "50%");
      window.clearTimeout(willChangeTimer);
      willChangeTimer = window.setTimeout(() => {
        transform.style.willChange = "";
      }, 280);
    };

    const measure = () => {
      bounds = root.getBoundingClientRect();
      boundsInvalid = false;
    };

    const render = () => {
      frame = 0;
      if (!enabled || !pointer) return;
      if (boundsInvalid || !bounds) measure();
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;

      const normalizedX = Math.min(1, Math.max(0, (pointer.x - bounds.left) / bounds.width));
      const normalizedY = Math.min(1, Math.max(0, (pointer.y - bounds.top) / bounds.height));
      const offsetX = normalizedX * 2 - 1;
      const offsetY = normalizedY * 2 - 1;

      transform.style.willChange = "transform";
      transform.style.setProperty("--depth-duration", "90ms");
      transform.style.setProperty("--depth-rotate-x", `${-offsetY * maxRotation}deg`);
      transform.style.setProperty("--depth-rotate-y", `${offsetX * maxRotation}deg`);
      transform.style.setProperty("--depth-translate-x", `${offsetX * maxTranslation}px`);
      transform.style.setProperty("--depth-translate-y", `${offsetY * maxTranslation}px`);
      transform.style.setProperty("--depth-glare-x", `${normalizedX * 100}%`);
      transform.style.setProperty("--depth-glare-y", `${normalizedY * 100}%`);
    };

    const queueRender = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const onPointerEnter = (event: PointerEvent) => {
      if (!enabled || event.pointerType !== "mouse") return;
      measure();
      pointer = { x: event.clientX, y: event.clientY };
      queueRender();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!enabled || event.pointerType !== "mouse") return;
      pointer = { x: event.clientX, y: event.clientY };
      queueRender();
    };

    const onPointerLeave = () => reset();
    const invalidateBounds = () => {
      boundsInvalid = true;
    };
    const updateMode = () => {
      enabled = pointerQuery.matches && !motionQuery.matches;
      if (!enabled) reset();
    };

    const observer = new ResizeObserver(invalidateBounds);
    observer.observe(root);
    root.addEventListener("pointerenter", onPointerEnter);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("pointercancel", onPointerLeave);
    window.addEventListener("resize", invalidateBounds, { passive: true });
    window.addEventListener("scroll", invalidateBounds, { capture: true, passive: true });
    pointerQuery.addEventListener("change", updateMode);
    motionQuery.addEventListener("change", updateMode);
    updateMode();

    return () => {
      root.removeEventListener("pointerenter", onPointerEnter);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("pointercancel", onPointerLeave);
      window.removeEventListener("resize", invalidateBounds);
      window.removeEventListener("scroll", invalidateBounds, true);
      pointerQuery.removeEventListener("change", updateMode);
      motionQuery.removeEventListener("change", updateMode);
      observer.disconnect();
      window.clearTimeout(willChangeTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [strength]);

  return (
    <div ref={rootRef} className={cn("depth-surface", className)}>
      <div ref={transformRef} className="depth-surface__transform">
        {children}
        {glare ? <span className="depth-surface__glare" aria-hidden="true" /> : null}
      </div>
    </div>
  );
}
