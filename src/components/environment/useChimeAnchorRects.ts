"use client";

import { useEffect, useState } from "react";
import type { ChimeAnchorRect, ChimeAnchorSlot } from "@/lib/wind-chime-anchors";

function sameRects(left: ChimeAnchorRect[], right: ChimeAnchorRect[]) {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate
      && entry.id === candidate.id
      && entry.visible === candidate.visible
      && Math.abs(entry.left - candidate.left) < 0.5
      && Math.abs(entry.top - candidate.top) < 0.5
      && Math.abs(entry.widthPx - candidate.widthPx) < 0.5
      && Math.abs(entry.heightPx - candidate.heightPx) < 0.5;
  });
}

export function useChimeAnchorRects(slots: ChimeAnchorSlot[]) {
  const [rects, setRects] = useState<ChimeAnchorRect[]>([]);

  useEffect(() => {
    if (slots.length === 0) {
      return;
    }
    let frame = 0;
    const observedTargets = new Set<HTMLElement>();
    const visibleTargets = new WeakMap<HTMLElement, boolean>();
    const resizeObserver = new ResizeObserver(() => schedule());
    const intersectionObserver = new IntersectionObserver((changes) => {
      changes.forEach((change) => visibleTargets.set(change.target as HTMLElement, change.isIntersecting));
      schedule();
    }, { rootMargin: "22% 0px", threshold: 0 });

    const refresh = () => {
      frame = 0;
      const entries = slots
        .map((slot) => [slot, document.querySelector<HTMLElement>(slot.selector)] as const)
        .filter((entry): entry is readonly [ChimeAnchorSlot, HTMLElement] => Boolean(entry[1]));
      entries.forEach(([, target]) => {
        if (observedTargets.has(target)) return;
        observedTargets.add(target);
        resizeObserver.observe(target);
        intersectionObserver.observe(target);
      });
      const interactiveRects = Array.from(document.querySelectorAll<HTMLElement>("header, nav, form, button, a, input, textarea, select, [data-environment-exclusion]"))
        .filter((element) => element.offsetParent !== null)
        .map((element) => element.getBoundingClientRect());
      const positioned = entries.map(([slot, target]) => {
        const widthPx = Math.round(Math.min(218, Math.max(138, 84 + slot.scale * 188)));
        const heightPx = Math.round(widthPx * 1.45);
        const targetRect = target.getBoundingClientRect();
        const edgeInset = Math.max(widthPx / 2 + 24, Math.min(120, window.innerWidth * 0.075));
        const centerX = slot.side === "left"
          ? edgeInset
          : window.innerWidth - edgeInset;
        const safeLeft = widthPx / 2 + 24;
        const safeRight = window.innerWidth - widthPx / 2 - 24;
        let centerY = targetRect.top + window.scrollY;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const viewportTop = centerY - window.scrollY - heightPx / 2;
          const candidate = { left: centerX - widthPx / 2, right: centerX + widthPx / 2, top: viewportTop, bottom: viewportTop + heightPx };
          const collision = interactiveRects.some((rect) => candidate.left < rect.right + 16 && candidate.right > rect.left - 16 && candidate.top < rect.bottom + 16 && candidate.bottom > rect.top - 16);
          if (!collision) break;
          centerY += (attempt % 2 === 0 ? 1 : -1) * (heightPx * .52 + attempt * 18);
        }
        return {
          ...slot,
          left: Math.min(safeRight, Math.max(safeLeft, centerX)) - widthPx / 2,
          top: centerY - heightPx / 2,
          widthPx,
          heightPx,
          visible: visibleTargets.get(target) ?? true,
          distance: Math.abs(targetRect.top - window.innerHeight / 2),
        };
      });
      const nearestVisibleIds = new Set(positioned
        .filter((entry) => entry.visible)
        .sort((left, right) => left.distance - right.distance)
        .slice(0, 2)
        .map((entry) => entry.id));
      const next: ChimeAnchorRect[] = positioned.map((entry) => ({
        id: entry.id,
        selector: entry.selector,
        side: entry.side,
        scale: entry.scale,
        depth: entry.depth,
        tone: entry.tone,
        tubeCount: entry.tubeCount,
        material: entry.material,
        left: entry.left,
        top: entry.top,
        widthPx: entry.widthPx,
        heightPx: entry.heightPx,
        visible: nearestVisibleIds.has(entry.id),
      }));
      setRects((current) => sameRects(current, next) ? current : next);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(refresh);
    };
    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("load", schedule, { once: true });
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
    };
  }, [slots]);

  return rects;
}
