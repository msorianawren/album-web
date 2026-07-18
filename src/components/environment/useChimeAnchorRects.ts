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

    const refresh = () => {
      frame = 0;
      const next = slots.map((slot) => {
        const widthPx = Math.round(Math.min(218, Math.max(138, 84 + slot.scale * 188)));
        const heightPx = Math.round(widthPx * 1.45);
        const centerX = window.innerWidth * slot.viewportX;
        const safeTop = heightPx / 2 + 32;
        const safeBottom = window.innerHeight - heightPx / 2 - 32;
        const safeLeft = widthPx / 2 + 24;
        const safeRight = window.innerWidth - widthPx / 2 - 24;
        const centerY = Math.min(safeBottom, Math.max(safeTop, window.innerHeight * slot.viewportY));
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
    window.addEventListener("resize", schedule, { passive: true });
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
    };
  }, [slots]);

  return rects;
}
