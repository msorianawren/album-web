"use client";

import { useCallback, useRef, useState } from "react";
import { ReliableMediaImage } from "@/components/media/ReliableMediaImage";
import { getMediaDeliveryDescriptor } from "@/lib/media/delivery";
import type { AlbumStatus, Media } from "@/lib/types";
import type { ThumbnailCell } from "@/lib/timeline/types";
import { Play } from "lucide-react";

interface MediaThumbnailProps {
  media: Media;
  cell: ThumbnailCell;
  albumStatus: AlbumStatus;
  downloadAllowed: boolean;
  protectAssets: boolean;
  onOpen: (mediaIndex: number) => void;
  priority?: boolean;
}

export function MediaThumbnail({
  media,
  cell,
  albumStatus,
  downloadAllowed,
  protectAssets,
  onOpen,
  priority = false,
}: MediaThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const descriptor = getMediaDeliveryDescriptor(media, {
    albumStatus,
    isAuthorized: true,
    downloadAllowed,
  });

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    pointerDownPos.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      // Ignore click if pointer moved significantly (drag/swipe)
      if (pointerDownPos.current) {
        const dx = event.clientX - pointerDownPos.current.x;
        const dy = event.clientY - pointerDownPos.current.y;
        if (Math.hypot(dx, dy) > 8) return;
      }
      onOpen(cell.mediaIndex);
    },
    [cell.mediaIndex, onOpen],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen(cell.mediaIndex);
      }
    },
    [cell.mediaIndex, onOpen],
  );

  const src = descriptor.card.src;
  const isVideo = media.media_type === "video";

  return (
    <button
      type="button"
      className="group relative block overflow-hidden bg-surface/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      style={{
        width: cell.width,
        height: cell.height,
        flexShrink: 0,
        flexGrow: 0,
      }}
      aria-label={descriptor.alt}
      onPointerDown={handlePointerDown}
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
    </button>
  );
}
