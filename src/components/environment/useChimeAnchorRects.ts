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
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main section"));
    const entries = slots
      .map((slot) => [slot, sections[slot.sectionIndex]] as const)
      .filter((entry): entry is readonly [ChimeAnchorSlot, HTMLElement] => Boolean(entry[1]));
    let frame = 0;

    const refresh = () => {
      frame = 0;
      const next = entries.map(([slot, section]) => {
        const widthPx = Math.round(Math.min(218, Math.max(138, 84 + slot.scale * 188)));
        const heightPx = Math.round(widthPx * 1.45);
        const sectionRect = section.getBoundingClientRect();
        const edgeInset = Math.max(widthPx / 2 + 24, Math.min(120, window.innerWidth * 0.075));
        const centerX = slot.side === "left"
          ? Math.max(edgeInset, sectionRect.left + edgeInset)
          : Math.min(window.innerWidth - edgeInset, sectionRect.right - edgeInset);
        const safeLeft = widthPx / 2 + 24;
        const safeRight = window.innerWidth - widthPx / 2 - 24;
        const centerY = sectionRect.top + window.scrollY + sectionRect.height * slot.align;
        return {
          ...slot,
          left: Math.min(safeRight, Math.max(safeLeft, centerX)) - widthPx / 2,
          top: centerY - heightPx / 2,
          widthPx,
          heightPx,
          visible: true,
        };
      });
      setRects((current) => sameRects(current, next) ? current : next);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(refresh);
    };
    const resizeObserver = new ResizeObserver(schedule);
    entries.forEach(([, section]) => resizeObserver.observe(section));
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("load", schedule, { once: true });
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
    };
  }, [slots]);

  return rects;
}
