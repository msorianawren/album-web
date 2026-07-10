"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Camera, RotateCcw, SlidersHorizontal } from "lucide-react";
import { MediaCard } from "@/components/media/MediaCard";
import { Button } from "@/components/ui/Button";
import {
  mediaSortLabels,
  mediaSortModes,
  parseMediaSortMode,
  sortMedia,
  type MediaSortMode,
} from "@/lib/media-sort";
import type { Media } from "@/lib/types";

const MediaViewer = dynamic(
  () => import("@/components/media/MediaViewer").then((mod) => mod.MediaViewer),
  { ssr: false },
);

interface MediaGridProps {
  albumId: string;
  media: Media[];
  downloadAllowed: boolean;
  protectAssets?: boolean;
  defaultSortMode?: string | null;
}

export function MediaGrid({
  albumId,
  media,
  downloadAllowed,
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
      index === null ? null : (index + 1) % sortedMedia.length,
    );
  }, [sortedMedia.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((index) =>
      index === null ? null : (index - 1 + sortedMedia.length) % sortedMedia.length,
    );
  }, [sortedMedia.length]);

  if (!media.length) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 py-20 text-center sm:px-8 lg:px-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface/80">
          <Camera className="h-7 w-7 text-text-secondary" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold text-text-primary">
          No media yet
        </h2>
        <p className="mt-3 max-w-md text-text-secondary">
          Photos and videos will appear here once the owner uploads them.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-20 sm:px-8 lg:px-12">
      <div className="mb-5 rounded-[1.4rem] border border-border bg-surface/82 p-3 shadow-xl shadow-text-primary/5 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Sort by</p>
              <p className="truncate text-sm font-semibold text-text-primary" aria-live="polite">
                {mediaSortLabels[sortMode]}{isPending ? "..." : ""}
              </p>
            </div>
          </div>

          <div className="hidden flex-wrap justify-end gap-2 lg:flex">
            {(["smart", "manual", "taken_desc", "uploaded_desc", "filename_asc", "portrait_first", "landscape_first", "liked_desc", "commented_desc", "shuffle"] as MediaSortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => chooseSortMode(mode)}
                className={`h-10 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  sortMode === mode
                    ? "border-accent bg-accent text-accent-foreground shadow-lg shadow-text-primary/10"
                    : "border-border bg-background/60 text-text-primary hover:border-accent/60 hover:bg-surface"
                }`}
                aria-pressed={sortMode === mode}
              >
                {mediaSortLabels[mode]}
              </button>
            ))}
            <Button variant="secondary" className="h-10 px-4" onClick={resetSortMode}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          <div className="grid gap-2 lg:hidden">
            <label className="sr-only" htmlFor={`album-sort-${albumId}`}>Sort album media</label>
            <select
              id={`album-sort-${albumId}`}
              value={sortMode}
              onChange={(event) => chooseSortMode(parseMediaSortMode(event.target.value))}
              className="h-12 w-full rounded-full border border-border bg-background/80 px-4 text-sm font-semibold text-text-primary outline-none focus:ring-2 focus:ring-ring"
            >
              {mediaSortModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mediaSortLabels[mode]}
                </option>
              ))}
            </select>
            <Button variant="secondary" className="w-full" onClick={resetSortMode}>
              <RotateCcw className="h-4 w-4" />
              Reset to default
            </Button>
          </div>
        </div>
      </div>

      <div className="columns-1 gap-4 sm:columns-2 md:columns-3 lg:columns-4">
        {sortedMedia.map((item, index) => (
          <MediaCard
            key={item.id}
            media={item}
            index={index}
            downloadAllowed={downloadAllowed}
            protectAssets={protectAssets}
            onOpen={setCurrentIndex}
          />
        ))}
      </div>
      <MediaViewer
        media={sortedMedia}
        currentIndex={currentIndex}
        downloadAllowed={downloadAllowed}
        protectAssets={protectAssets}
        onClose={() => setCurrentIndex(null)}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSelect={setCurrentIndex}
      />
    </section>
  );
}
