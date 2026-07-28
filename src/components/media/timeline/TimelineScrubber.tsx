"use client";

import { memo, useCallback, useRef, useState } from "react";
import type { ScrubberEntry } from "@/lib/timeline/types";

interface TimelineScrubberProps {
  entries: ScrubberEntry[];
  /** Currently active month key */
  activeMonthKey: string | null;
  /** Called when the user scrubs to a month; caller scrolls the container. */
  onScrub: (top: number, monthKey: string) => void;
}

/**
 * Vertical scrubber on the right edge of the timeline.
 *
 * Behavioral design informed by Immich v3.0.3:
 *   web/src/lib/managers/timeline-manager/timeline-manager.svelte.ts (scrubberMonths)
 *   web/src/lib/components/photos-page/timeline-scrollbar.svelte
 *
 * Differences:
 *   - React implementation using pointer events.
 *   - Oriana visual style (minimal, no NAS-style chrome).
 *   - Month labels shown on hover or drag.
 */
export const TimelineScrubber = memo(function TimelineScrubber({
  entries,
  activeMonthKey,
  onScrub,
}: TimelineScrubberProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const getScrubPosition = useCallback(
    (clientY: number): { top: number; monthKey: string } | null => {
      const track = trackRef.current;
      if (!track || entries.length === 0) return null;

      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      const idx = Math.min(
        entries.length - 1,
        Math.floor(ratio * entries.length),
      );
      const entry = entries[idx];
      if (!entry) return null;
      return { top: entry.top, monthKey: entry.monthKey };
    },
    [entries],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const track = trackRef.current;
      if (!track) return;
      track.setPointerCapture(event.pointerId);
      setIsDragging(true);
      const pos = getScrubPosition(event.clientY);
      if (pos) {
        onScrub(pos.top, pos.monthKey);
        setHoveredKey(pos.monthKey);
      }
    },
    [getScrubPosition, onScrub],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const pos = getScrubPosition(event.clientY);
      if (pos) {
        onScrub(pos.top, pos.monthKey);
        setHoveredKey(pos.monthKey);
      }
    },
    [isDragging, getScrubPosition, onScrub],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      trackRef.current?.releasePointerCapture(event.pointerId);
      setIsDragging(false);
    },
    [],
  );

  if (entries.length <= 1) return null;

  const activeIdx = entries.findIndex((e) => e.monthKey === activeMonthKey);
  const labelKey = hoveredKey ?? activeMonthKey;
  const labelEntry = entries.find((e) => e.monthKey === labelKey);

  return (
    <div
      className="group absolute right-0 top-0 flex h-full w-8 flex-col items-center justify-center"
      aria-label="Timeline date scrubber"
      role="slider"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={entries.length - 1}
      aria-valuenow={Math.max(0, activeIdx)}
      aria-valuetext={labelEntry?.label ?? ""}
    >
      {/* Floating month label */}
      {labelEntry && (isDragging || hoveredKey) && (
        <div
          className="pointer-events-none absolute right-10 z-50 whitespace-nowrap rounded-full bg-text-primary px-3 py-1 text-[0.65rem] font-semibold tracking-wide text-background shadow-lg"
          style={{
            top: `${((entries.findIndex((e) => e.monthKey === labelEntry.monthKey)) / Math.max(1, entries.length - 1)) * 100}%`,
            transform: "translateY(-50%)",
          }}
          aria-hidden="true"
        >
          {labelEntry.label}
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className="relative flex h-full w-1.5 cursor-ns-resize flex-col items-center py-2"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { if (!isDragging) setHoveredKey(null); }}
      >
        {/* Track background */}
        <div className="absolute inset-0 mx-auto w-px bg-border/30" />

        {/* Month tick marks */}
        {entries.map((entry, idx) => {
          const isActive = entry.monthKey === activeMonthKey;
          const topPercent = (idx / Math.max(1, entries.length - 1)) * 100;
          return (
            <button
              key={entry.monthKey}
              type="button"
              className="absolute -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none"
              style={{ top: `${topPercent}%`, left: "50%" }}
              aria-label={`Jump to ${entry.label}`}
              onClick={(event) => {
                event.stopPropagation();
                onScrub(entry.top, entry.monthKey);
              }}
              onMouseEnter={() => setHoveredKey(entry.monthKey)}
              onMouseLeave={() => { if (!isDragging) setHoveredKey(null); }}
            >
              <div
                className={`rounded-full transition-all duration-150 ${
                  isActive
                    ? "h-2.5 w-2.5 bg-text-primary"
                    : "h-1.5 w-1.5 bg-border/50 group-hover:bg-border/80"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
});
