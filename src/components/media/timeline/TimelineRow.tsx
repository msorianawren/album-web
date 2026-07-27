"use client";

import { memo } from "react";
import { MediaThumbnail } from "@/components/media/timeline/MediaThumbnail";
import type { RowLayout } from "@/lib/timeline/types";
import type { AlbumStatus, Media } from "@/lib/types";

interface TimelineRowProps {
  row: RowLayout;
  media: Media[];
  albumStatus: AlbumStatus;
  downloadAllowed: boolean;
  protectAssets: boolean;
  onOpen: (mediaIndex: number) => void;
  isFirstInGroup?: boolean;
}

/**
 * Renders one justified row of thumbnails within a date group.
 * Height and width are already computed by the layout engine.
 * Uses absolute positioning within a relative container to achieve
 * pixel-perfect layout with no CLS.
 */
export const TimelineRow = memo(function TimelineRow({
  row,
  media,
  albumStatus,
  downloadAllowed,
  protectAssets,
  onOpen,
  isFirstInGroup = false,
}: TimelineRowProps) {
  // Row height without the gap padding
  const rowDisplayHeight = row.cells[0]?.height ?? row.height;

  return (
    <div
      className="relative w-full"
      style={{ height: rowDisplayHeight }}
      role="list"
      aria-label={`Photo row ${row.rowIndex + 1}`}
    >
      {row.cells.map((cell, idx) => {
        const item = media[cell.mediaIndex];
        if (!item) return null;
        return (
          <div
            key={cell.mediaId}
            className="absolute top-0"
            style={{ left: cell.left, width: cell.width, height: cell.height }}
            role="listitem"
          >
            <MediaThumbnail
              media={item}
              cell={cell}
              albumStatus={albumStatus}
              downloadAllowed={downloadAllowed}
              protectAssets={protectAssets}
              onOpen={onOpen}
              priority={isFirstInGroup && idx === 0}
            />
          </div>
        );
      })}
    </div>
  );
});
