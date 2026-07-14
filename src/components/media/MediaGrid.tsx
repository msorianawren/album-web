"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { MediaCard } from "@/components/media/MediaCard";
import { Button } from "@/components/ui/Button";
import {
  mediaSortLabels,
  mediaSortModes,
  parseMediaSortMode,
  sortMedia,
  type MediaSortMode,
} from "@/lib/media-sort";
import type { AlbumStatus, Media } from "@/lib/types";

const MediaViewer = dynamic(
  () => import("@/components/media/MediaViewer").then((mod) => mod.MediaViewer),
  { ssr: false },
);

interface MediaGridProps {
  albumId: string;
  media: Media[];
  downloadAllowed: boolean;
  albumStatus: AlbumStatus;
  protectAssets?: boolean;
  defaultSortMode?: string | null;
}

export function MediaGrid({
  albumId,
  media,
  downloadAllowed,
  albumStatus,
  protectAssets = false,
  defaultSortMode = "smart",
}: MediaGridProps) {
  const storageKey = `album:${albumId}:sort`;
  const defaultMode = parseMediaSortMode(defaultSortMode, "smart");
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<MediaSortMode>(() => {
    if (typeof window === "undefined") return defaultMode;
    try {
      return parseMediaSortMode(window.localStorage.getItem(storageKey), defaultMode);
    } catch {
      return defaultMode;
    }
  });
  
  const [shuffleSeed, setShuffleSeed] = useState(() => `${albumId}:${Date.now()}`);
  const [isPending, startTransition] = useTransition();

  const sortedMedia = useMemo(
    () => sortMedia(media, sortMode, shuffleSeed),
    [media, shuffleSeed, sortMode],
  );
  const viewableMedia = useMemo(
    () =>
      sortedMedia.filter(
        (item) =>
          item.processing_status !== "pending" &&
          item.processing_status !== "failed" &&
          item.security_status !== "rejected",
      ),
    [sortedMedia],
  );
  const viewerIndexById = useMemo(
    () => new Map(viewableMedia.map((item, index) => [item.id, index])),
    [viewableMedia],
  );

  const chooseSortMode = useCallback((value: MediaSortMode) => {
    startTransition(() => {
      if (value === "shuffle") setShuffleSeed(`${albumId}:${Date.now()}:${Math.random()}`);
      setSortMode(value);
      try {
        window.localStorage.setItem(storageKey, value);
      } catch {
        // Local storage is only a convenience for the viewer session.
      }
      setCurrentIndex(null);
    });
  }, [albumId, storageKey]);

  const resetSortMode = useCallback(() => {
    startTransition(() => {
      setSortMode(defaultMode);
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Ignore private browsing storage failures.
      }
      setCurrentIndex(null);
    });
  }, [defaultMode, storageKey]);

  const handleNext = useCallback(() => {
    setCurrentIndex((index) =>
      index === null || viewableMedia.length === 0
        ? null
        : (index + 1) % viewableMedia.length,
    );
  }, [viewableMedia.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((index) =>
      index === null || viewableMedia.length === 0
        ? null
        : (index - 1 + viewableMedia.length) % viewableMedia.length,
    );
  }, [viewableMedia.length]);

  if (!media.length) {
    return (
      <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 sm:px-6 py-20 sm:py-32 text-center">
        <div className="mb-6 sm:mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-surface/30 border border-border/40">
          <Camera className="h-8 w-8 text-text-secondary/30" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-3xl font-normal text-text-primary mb-4">
          Empty Archive
        </h2>
        <p className="max-w-[400px] text-[0.95rem] leading-[1.8] text-text-secondary font-light">
          Visual works will be curated and published here once available.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6 sm:pb-32">
      <div className="mb-8 sm:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-text-secondary">
            Sort Layout
          </span>
          {isPending && <span className="text-[0.65rem] italic text-text-secondary/50">Curating...</span>}
        </div>

        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          {(["smart", "manual", "taken_desc", "portrait_first", "liked_desc", "shuffle"] as MediaSortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => chooseSortMode(mode)}
              className={`h-9 rounded-full px-4 text-[0.65rem] font-semibold uppercase tracking-widest transition-colors ${
                sortMode === mode
                  ? "bg-text-primary text-background"
                  : "bg-surface/30 text-text-secondary hover:text-text-primary hover:bg-surface"
              }`}
              aria-pressed={sortMode === mode}
            >
              {mediaSortLabels[mode]}
            </button>
          ))}
          <Button variant="icon" className="h-9 w-9 rounded-full text-text-secondary hover:text-text-primary" onClick={resetSortMode} aria-label="Reset sort">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid gap-2 lg:hidden w-full max-w-xs">
          <label className="sr-only" htmlFor={`album-sort-${albumId}`}>Sort media</label>
          <select
            id={`album-sort-${albumId}`}
            value={sortMode}
            onChange={(event) => chooseSortMode(parseMediaSortMode(event.target.value))}
            className="h-10 w-full rounded-full border border-border/40 bg-surface/30 px-4 text-[0.8rem] font-medium text-text-primary outline-none focus:border-text-primary/30 appearance-none"
          >
            {mediaSortModes.map((mode) => (
              <option key={mode} value={mode}>
                {mediaSortLabels[mode]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div id="media-grid" className="columns-1 gap-3 sm:columns-2 sm:gap-4 md:columns-3 lg:columns-4">
        {sortedMedia.map((item, index) => (
          <MediaCard
            key={item.id}
            media={item}
            index={viewerIndexById.get(item.id) ?? index}
            downloadAllowed={downloadAllowed}
            albumStatus={albumStatus}
            protectAssets={protectAssets}
            onOpen={setCurrentIndex}
          />
        ))}
      </div>
      <MediaViewer
        media={viewableMedia}
        currentIndex={currentIndex}
        downloadAllowed={downloadAllowed}
        albumStatus={albumStatus}
        protectAssets={protectAssets}
        onClose={() => setCurrentIndex(null)}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSelect={setCurrentIndex}
      />
    </section>
  );
}
