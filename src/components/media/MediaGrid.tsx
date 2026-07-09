"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useTransition, useEffect } from "react";
import { Camera, RotateCcw, SlidersHorizontal, Edit3, X, Save } from "lucide-react";
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
  const layoutStorageKey = `journal-layout-${albumId}`;
  
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

  // Journal Layout State
  const [isEditMode, setIsEditMode] = useState(false);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(layoutStorageKey);
      if (saved) setCustomOrder(JSON.parse(saved));
    } catch {}
  }, [layoutStorageKey]);

  const sortedMedia = useMemo(
    () => sortMedia(media, sortMode, shuffleSeed),
    [media, shuffleSeed, sortMode],
  );

  const finalMedia = useMemo(() => {
    if (customOrder.length > 0) {
      const orderMap = new Map(customOrder.map((id, index) => [id, index]));
      return [...sortedMedia].sort((a, b) => {
        const aIndex = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
        const bIndex = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
        return aIndex - bIndex;
      });
    }
    return sortedMedia;
  }, [sortedMedia, customOrder]);

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
      index === null ? null : (index + 1) % finalMedia.length,
    );
  }, [finalMedia.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((index) =>
      index === null ? null : (index - 1 + finalMedia.length) % finalMedia.length,
    );
  }, [finalMedia.length]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => el.classList.add('opacity-40', 'scale-95'), 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null);
    const el = e.currentTarget as HTMLElement;
    el.classList.remove('opacity-40', 'scale-95');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentOrder = customOrder.length > 0 ? customOrder : finalMedia.map(m => m.id);
    const draggedIndex = currentOrder.indexOf(draggedId);
    const targetIndex = currentOrder.indexOf(targetId);

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    setCustomOrder(newOrder);
    try {
      window.localStorage.setItem(layoutStorageKey, JSON.stringify(newOrder));
    } catch {}
  };

  const resetCustomLayout = () => {
    setCustomOrder([]);
    try {
      window.localStorage.removeItem(layoutStorageKey);
    } catch {}
  };

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
            {!isEditMode && (
              <>
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
              </>
            )}
            
            {/* Journal Edit Mode Toggle (Desktop Only) */}
            <div className="ml-4 border-l border-border pl-4 flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Button variant="secondary" className="h-10 px-4" onClick={resetCustomLayout}>
                    <RotateCcw className="h-4 w-4" />
                    Reset Layout
                  </Button>
                  <Button variant="primary" className="h-10 px-4" onClick={() => setIsEditMode(false)}>
                    <Save className="h-4 w-4 mr-2" />
                    Done Editing
                  </Button>
                </>
              ) : (
                <Button variant="secondary" className="h-10 px-4" onClick={() => setIsEditMode(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Journal Layout
                </Button>
              )}
            </div>
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
            {/* Edit mode note for mobile */}
            <p className="text-center text-xs text-text-secondary mt-2">Journal layout editing is available on desktop.</p>
          </div>
        </div>
      </div>

      <div className={`columns-1 gap-4 sm:columns-2 md:columns-3 lg:columns-4 ${isEditMode ? "p-2 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5" : ""}`}>
        {finalMedia.map((item, index) => (
          <div 
            key={item.id}
            draggable={isEditMode}
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, item.id)}
            className={`transition-all duration-300 ${isEditMode ? "cursor-move hover:ring-2 hover:ring-accent hover:ring-offset-4 rounded-[2px]" : ""}`}
          >
            <div className={isEditMode ? "pointer-events-none" : ""}>
              <MediaCard
                media={item}
                index={index}
                downloadAllowed={downloadAllowed}
                protectAssets={protectAssets}
                onOpen={setCurrentIndex}
              />
            </div>
          </div>
        ))}
      </div>
      <MediaViewer
        media={finalMedia}
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
