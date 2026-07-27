"use client";

import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import { Filter, Search, X } from "lucide-react";
import type { Media } from "@/lib/types";

type MediaTypeFilter = "all" | "image" | "video";
type OrientationFilter = "all" | "portrait" | "landscape" | "square";

export interface AlbumFilterState {
  query: string;
  mediaType: MediaTypeFilter;
  orientation: OrientationFilter;
}

const EMPTY_FILTER: AlbumFilterState = {
  query: "",
  mediaType: "all",
  orientation: "all",
};

function isFilterActive(f: AlbumFilterState): boolean {
  return f.query.trim() !== "" || f.mediaType !== "all" || f.orientation !== "all";
}

function matchesFilter(item: Media, f: AlbumFilterState): boolean {
  // Media type
  if (f.mediaType !== "all" && item.media_type !== f.mediaType) return false;

  // Orientation
  if (f.orientation !== "all") {
    const w = item.width ?? 0;
    const h = item.height ?? 0;
    if (f.orientation === "portrait" && !(h > w)) return false;
    if (f.orientation === "landscape" && !(w > h)) return false;
    if (f.orientation === "square" && !(Math.abs(w - h) <= Math.max(4, w * 0.05))) return false;
  }

  // Text query: match title or original_filename (case-insensitive)
  const q = f.query.trim().toLowerCase();
  if (q) {
    const title = (item.title ?? "").toLowerCase();
    const filename = (item.original_filename ?? "").toLowerCase();
    if (!title.includes(q) && !filename.includes(q)) return false;
  }

  return true;
}

interface AlbumSearchFilterProps {
  media: Media[];
  onFiltered: (filtered: Media[]) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

/**
 * Album-scoped search and filter bar.
 *
 * Filters are applied client-side over the loaded media array.
 * No additional network requests required.
 *
 * Behavioral design informed by Immich v3.0.3 filter chips pattern.
 */
export function AlbumSearchFilter({ media, onFiltered, searchInputRef: externalRef }: AlbumSearchFilterProps) {
  const [filter, setFilter] = useState<AlbumFilterState>(EMPTY_FILTER);
  const [panelOpen, setPanelOpen] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;

  const applyFilter = useCallback(
    (next: AlbumFilterState) => {
      setFilter(next);
      const filtered = isFilterActive(next)
        ? media.filter((item) => matchesFilter(item, next))
        : media;
      onFiltered(filtered);
    },
    [media, onFiltered],
  );

  const updateQuery = useCallback(
    (query: string) => applyFilter({ ...filter, query }),
    [applyFilter, filter],
  );

  const updateMediaType = useCallback(
    (mediaType: MediaTypeFilter) => applyFilter({ ...filter, mediaType }),
    [applyFilter, filter],
  );

  const updateOrientation = useCallback(
    (orientation: OrientationFilter) => applyFilter({ ...filter, orientation }),
    [applyFilter, filter],
  );

  const clearAll = useCallback(() => {
    applyFilter(EMPTY_FILTER);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyFilter]);

  const active = isFilterActive(filter);
  const resultCount = useMemo(
    () => (active ? media.filter((item) => matchesFilter(item, filter)).length : media.length),
    [active, filter, media],
  );

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Search bar row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary/50 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={filter.query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search by title or filename…"
            className="h-9 w-full rounded-full border border-border/40 bg-surface/20 pl-9 pr-4 text-[0.8rem] text-text-primary placeholder:text-text-secondary/40 outline-none focus:border-text-primary/30 focus:bg-surface/40 transition-colors"
            aria-label="Search media in album"
          />
          {filter.query && (
            <button
              type="button"
              onClick={() => updateQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/50 hover:text-text-primary"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-[0.7rem] font-semibold transition-colors ${
            panelOpen || filter.mediaType !== "all" || filter.orientation !== "all"
              ? "border-text-primary/40 bg-text-primary text-background"
              : "border-border/40 bg-surface/20 text-text-secondary hover:text-text-primary"
          }`}
          aria-expanded={panelOpen}
          aria-label="Toggle filters"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
        </button>

        {/* Clear all */}
        {active && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[0.7rem] font-medium text-text-secondary/60 hover:text-text-primary underline underline-offset-2 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter panel */}
      {panelOpen && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/30 bg-surface/10 px-4 py-3">
          {/* Media type */}
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-text-secondary/60">
              Type
            </span>
            {(["all", "image", "video"] as MediaTypeFilter[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateMediaType(type)}
                className={`h-7 rounded-full px-3 text-[0.65rem] font-semibold transition-colors ${
                  filter.mediaType === type
                    ? "bg-text-primary text-background"
                    : "bg-surface/30 text-text-secondary hover:bg-surface hover:text-text-primary"
                }`}
                aria-pressed={filter.mediaType === type}
              >
                {type === "all" ? "All" : type === "image" ? "Photos" : "Videos"}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border/30" aria-hidden="true" />

          {/* Orientation */}
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-text-secondary/60">
              Orientation
            </span>
            {(["all", "landscape", "portrait", "square"] as OrientationFilter[]).map((orient) => (
              <button
                key={orient}
                type="button"
                onClick={() => updateOrientation(orient)}
                className={`h-7 rounded-full px-3 text-[0.65rem] font-semibold capitalize transition-colors ${
                  filter.orientation === orient
                    ? "bg-text-primary text-background"
                    : "bg-surface/30 text-text-secondary hover:bg-surface hover:text-text-primary"
                }`}
                aria-pressed={filter.orientation === orient}
              >
                {orient === "all" ? "All" : orient}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result count */}
      {active && (
        <p className="text-[0.65rem] font-medium text-text-secondary/60">
          Showing {resultCount} of {media.length} {media.length === 1 ? "item" : "items"}
        </p>
      )}
    </div>
  );
}
