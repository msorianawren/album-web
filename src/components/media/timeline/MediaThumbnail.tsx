"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Play } from "lucide-react";
import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import { getMediaDeliveryDescriptor } from "@/lib/media/delivery";
import type { AlbumStatus, Media } from "@/lib/types";
import type { ThumbnailCell } from "@/lib/timeline/types";

interface MediaThumbnailProps {
  media: Media;
  cell: ThumbnailCell;
  albumStatus: AlbumStatus;
  downloadAllowed: boolean;
  protectAssets: boolean;
  onOpen: (mediaIndex: number) => void;
  priority?: boolean;
  // Selection
  selectionActive?: boolean;
  isSelected?: boolean;
  isRangeCandidate?: boolean;
  onSelect?: (mediaIndex: number, shiftKey: boolean) => void;
  onLongPress?: (mediaIndex: number) => void;
}

export function MediaThumbnail({
  media,
  cell,
  albumStatus,
  downloadAllowed,
  protectAssets,
  onOpen,
  priority = false,
  selectionActive = false,
  isSelected = false,
  isRangeCandidate = false,
  onSelect,
  onLongPress,
}: MediaThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const descriptor = getMediaDeliveryDescriptor(media, {
    albumStatus,
    isAuthorized: true,
    downloadAllowed,
  });

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    pointerDownPos.current = { x: event.clientX, y: event.clientY };
    longPressTriggered.current = false;
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        longPressTriggered.current = true;
        onLongPress(cell.mediaIndex);
      }, 500);
    }
  }, [cell.mediaIndex, onLongPress]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (longPressTimer.current !== null) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (longPressTriggered.current) {
        longPressTriggered.current = false;
        return;
      }
      // Ignore click if pointer moved significantly (drag/swipe)
      if (pointerDownPos.current) {
        const dx = event.clientX - pointerDownPos.current.x;
        const dy = event.clientY - pointerDownPos.current.y;
        if (Math.hypot(dx, dy) > 8) return;
      }
      if (selectionActive && onSelect) {
        onSelect(cell.mediaIndex, event.shiftKey);
        return;
      }
      onOpen(cell.mediaIndex);
    },
    [cell.mediaIndex, onOpen, selectionActive, onSelect],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (selectionActive && onSelect) {
          onSelect(cell.mediaIndex, false);
          return;
        }
        onOpen(cell.mediaIndex);
      }
    },
    [cell.mediaIndex, onOpen, selectionActive, onSelect],
  );

  const src = descriptor.card.src;
  const isVideo = media.media_type === "video";
  const isHighlighted = isSelected || isRangeCandidate;

  return (
    <button
      type="button"
      className={`group relative block overflow-hidden bg-surface/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
        isHighlighted ? "ring-2 ring-white/80 ring-inset" : ""
      }`}
      style={{
        width: cell.width,
        height: cell.height,
        flexShrink: 0,
        flexGrow: 0,
      }}
      aria-label={descriptor.alt}
      data-media-index={cell.mediaIndex}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Blurhash / placeholder before image loads */}
      {!loaded && descriptor.blurhash && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "hsl(28 20% 85%)" }}
          aria-hidden="true"
        />
      )}

      {src ? (
        <div
          className="absolute inset-0 transition-opacity duration-150"
          style={{ opacity: loaded ? 1 : 0 }}
        >
          <ReliableMediaImage
            target={descriptor.card}
            alt={descriptor.alt}
            blurhash={descriptor.blurhash}
            width={cell.width}
            height={cell.height}
            sizes={`${cell.width}px`}
            className="absolute inset-0 h-full w-full object-cover"
            priority={priority}
            draggable={false}
            onLoad={() => setLoaded(true)}
            onUnavailable={() => setLoaded(true)}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/30">
          <span className="text-xs text-text-secondary/50">—</span>
        </div>
      )}

      {/* Video indicator */}
      {isVideo && (
        <div className="pointer-events-none absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
          <Play className="h-3.5 w-3.5 fill-white text-white" aria-hidden="true" />
        </div>
      )}

      {/* Hover overlay */}
      {src && (
        <div
          className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-150 group-hover:bg-black/10"
          aria-hidden="true"
        />
      )}

      {/* Right-click protection */}
      {protectAssets && (
        <div
          className="absolute inset-0"
          onContextMenu={(event) => event.preventDefault()}
          aria-hidden="true"
        />
      )}
      {/* Selection checkbox overlay */}
      {(selectionActive || isHighlighted) && (
        <div
          className={`pointer-events-none absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-100 ${
            isSelected
              ? "border-white bg-white"
              : "border-white/80 bg-black/30"
          }`}
          aria-hidden="true"
        >
          {isSelected && <Check className="h-3 w-3 text-text-primary" />}
        </div>
      )}
    </button>
  );
}
