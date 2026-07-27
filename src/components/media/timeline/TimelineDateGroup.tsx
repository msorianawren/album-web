"use client";

import { memo } from "react";
import { TimelineRow } from "@/components/media/timeline/TimelineRow";
import type { DateGroup } from "@/lib/timeline/types";
import type { AlbumStatus, Media } from "@/lib/types";

interface TimelineDateGroupProps {
  group: DateGroup;
  media: Media[];
  albumStatus: AlbumStatus;
  downloadAllowed: boolean;
  protectAssets: boolean;
  onOpen: (mediaIndex: number) => void;
  gap?: number;
  // Selection
  selectionActive?: boolean;
  isSelected?: (mediaId: string) => boolean;
  isRangeCandidate?: (mediaId: string) => boolean;
  onSelect?: (mediaIndex: number, shiftKey: boolean) => void;
  onLongPress?: (mediaIndex: number) => void;
}

const DEFAULT_GAP = 4;

/**
 * Renders a single date group: sticky label + justified rows.
 * The outer div is absolutely positioned within the timeline container,
 * so its top offset is provided by the caller (MediaTimeline).
 */
export const TimelineDateGroup = memo(function TimelineDateGroup({
  group,
  media,
  albumStatus,
  downloadAllowed,
  protectAssets,
  onOpen,
  gap = DEFAULT_GAP,
  selectionActive = false,
  isSelected,
  isRangeCandidate,
  onSelect,
  onLongPress,
}: TimelineDateGroupProps) {
  return (
    <div
      id={`timeline-group-${group.key}`}
      data-timeline-group={group.key}
      data-month-key={group.monthKey}
      className="w-full"
      style={{ height: group.height }}
    >
      {/* Sticky date header */}
      <div
        className="sticky z-10 flex h-[44px] items-center"
        style={{ top: 0 }}
      >
        <span className="rounded-full bg-background/80 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-secondary backdrop-blur-sm">
          {group.label}
        </span>
        <span className="ml-2 text-[0.6rem] text-text-secondary/40">
          {group.mediaIndices.length}
        </span>
      </div>

      {/* Justified rows */}
      <div className="flex flex-col" style={{ gap }}>
        {group.rows.map((row, rowIdx) => (
          <TimelineRow
            key={row.rowIndex}
            row={row}
            media={media}
            albumStatus={albumStatus}
            downloadAllowed={downloadAllowed}
            protectAssets={protectAssets}
            onOpen={onOpen}
            isFirstInGroup={rowIdx === 0}
            selectionActive={selectionActive}
            isSelected={isSelected}
            isRangeCandidate={isRangeCandidate}
            onSelect={onSelect}
            onLongPress={onLongPress}
          />
        ))}
      </div>
    </div>
  );
});
