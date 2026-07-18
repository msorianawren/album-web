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
    const visible = new Map(entries.map(([slot]) => [slot.id, false]));
    const elementSlots = new Map<HTMLElement, ChimeAnchorSlot[]>();
    let frame = 0;

    entries.forEach(([slot, element]) => {
      const assigned = elementSlots.get(element) ?? [];
      assigned.push(slot);
      elementSlots.set(element, assigned);
    });

    const refresh = () => {
      frame = 0;
      const next = entries.map(([slot, element]) => {
        const rect = element.getBoundingClientRect();
        const widthPx = Math.round(Math.min(184, Math.max(104, 86 + slot.scale * 150)));
        const heightPx = Math.round(widthPx * 1.34);
        const edgeInset = Math.min(104, Math.max(44, window.innerWidth * 0.075));
        const centerX = slot.side === "left" ? Math.max(edgeInset, rect.left + edgeInset) : Math.min(window.innerWidth - edgeInset, rect.right - edgeInset);
        const centerY = rect.top + rect.height * slot.align;
        return {
          ...slot,
          left: centerX - widthPx / 2,
          top: centerY - heightPx / 2,
          widthPx,
          heightPx,
          visible: visible.get(slot.id) ?? false,
        };
      });
      setRects((current) => sameRects(current, next) ? current : next);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(refresh);
    };
    const resizeObserver = new ResizeObserver(schedule);
    const intersectionObserver = new IntersectionObserver((observed) => {
      observed.forEach((entry) => {
        elementSlots.get(entry.target as HTMLElement)?.forEach((slot) => visible.set(slot.id, entry.isIntersecting));
      });
      schedule();
    }, { threshold: 0.02 });

    entries.forEach(([, element]) => {
      resizeObserver.observe(element);
      intersectionObserver.observe(element);
    });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [slots]);

  return rects;
}
