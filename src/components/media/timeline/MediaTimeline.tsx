"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TimelineDateGroup } from "@/components/media/timeline/TimelineDateGroup";
import { TimelineScrubber } from "@/components/media/timeline/TimelineScrubber";
import { SelectionActionBar } from "@/components/media/timeline/SelectionActionBar";
import { useSelectionController } from "@/hooks/useSelectionController";
import { AlbumSearchFilter } from "@/components/media/timeline/AlbumSearchFilter";
import {
  mediaSortLabels,
  parseMediaSortMode,
  sortMedia,
  type MediaSortMode,
} from "@/lib/media-sort";
import {
  computeTimelineLayout,
  computeVirtualRange,
  computeScrubberEntries,
  findGroupAtScrollTop,
  groupMediaByDate,
  scrollRestorationKey,
  saveScrollPosition,
  loadScrollPosition,
} from "@/lib/timeline/engine";
import type { DateGroup, ScrubberEntry, TimelineMediaItem } from "@/lib/timeline/types";
import { emitScrollBusy } from "@/lib/timeline/scroll-busy";
import { viewerIndexFromMediaId, viewerUrlForMedia, viewerUrlWithoutMedia } from "@/lib/media/viewer-routes";
import type { AlbumStatus, Media } from "@/lib/types";
import { isMediaReadyForDelivery } from "@/lib/media/delivery";

// MediaViewer is heavy; load only when needed
const MediaViewer = dynamic(
  () => import("@/components/media/MediaViewer").then((mod) => mod.MediaViewer),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_ROW_HEIGHT = 220;
const GAP = 4;
const HEADER_HEIGHT = 44;
const GROUP_PADDING_BOTTOM = 24;
const OVERSCAN = 2;
const SCROLL_THROTTLE_MS = 16; // ~60 fps

// ---------------------------------------------------------------------------
// Media → TimelineMediaItem adapter
// ---------------------------------------------------------------------------

function toTimelineItem(item: Media, mediaIndex: number): TimelineMediaItem {
  return {
    id: item.id,
    mediaIndex,
    sortDate: item.sort_date ?? item.taken_at ?? item.created_at,
    width: item.width,
    height: item.height,
    aspectRatio: item.aspect_ratio ?? null,
    mediaType: item.media_type,
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MediaTimelineProps {
  albumId: string;
  media: Media[];
  downloadAllowed: boolean;
  albumStatus: AlbumStatus;
  protectAssets?: boolean;
  defaultSortMode?: string | null;
  locale?: "en" | "vi";
  timeZone?: string;
}

const TIMELINE_SORT_MODES = ["taken_desc", "taken_asc"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MediaTimeline({
  albumId,
  media,
  downloadAllowed,
  albumStatus,
  protectAssets = false,
  defaultSortMode = "taken_desc",
  locale = "en",
  timeZone = "Asia/Ho_Chi_Minh",
}: MediaTimelineProps) {
  // ── Sort state ────────────────────────────────────────────────────────────
  const storageKey = `album:${albumId}:timeline-sort`;
  const parsedDefaultMode = parseMediaSortMode(defaultSortMode, "taken_desc");
  const defaultMode: MediaSortMode = TIMELINE_SORT_MODES.includes(
    parsedDefaultMode as (typeof TIMELINE_SORT_MODES)[number],
  )
    ? parsedDefaultMode
    : "taken_desc";

  const [sortMode, setSortMode] = useState<MediaSortMode>(() => {
    if (typeof window === "undefined") return defaultMode;
    try {
      const stored = parseMediaSortMode(window.localStorage.getItem(storageKey), defaultMode);
      return TIMELINE_SORT_MODES.includes(stored as (typeof TIMELINE_SORT_MODES)[number])
        ? stored
        : defaultMode;
    } catch {
      return defaultMode;
    }
  });

  const shuffleSeed = albumId;
  const [isPending, startTransition] = useTransition();

  // ── Media arrays ──────────────────────────────────────────────────────────
  const sortedMedia = useMemo(
    () => sortMedia(media, sortMode, shuffleSeed),
    [media, shuffleSeed, sortMode],
  );

  // Filter state: null means no filter active (use sortedMedia directly)
  const [filteredMedia, setFilteredMedia] = useState<Media[] | null>(null);

  const viewableMedia = useMemo(
    () => (filteredMedia ?? sortedMedia).filter(isMediaReadyForDelivery),
    [sortedMedia, filteredMedia],
  );
  const handleFilteredMedia = useCallback((filtered: Media[]) => {
    setFilteredMedia(filtered.length === sortedMedia.length ? null : filtered);
  }, [sortedMedia.length]);

  const timelineItems = useMemo<TimelineMediaItem[]>(
    () => viewableMedia.map((item, idx) => toTimelineItem(item, idx)),
    [viewableMedia],
  );

  // ── Viewer state ──────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [hasOpenedViewer, setHasOpenedViewer] = useState(false);
  const openedFromTimelineRef = useRef(false);
  const scrollBeforeViewerRef = useRef(0);
  const focusedIndexBeforeViewerRef = useRef<number | null>(null);

  // ── Container + layout state ──────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(container.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Layout calculation ────────────────────────────────────────────────────
  const { groups, totalHeight, scrubberEntries } = useMemo(() => {
    const datePolicy = { locale, timeZone };
    const rawGroups = groupMediaByDate(timelineItems, datePolicy);

    if (containerWidth <= 0) {
      return { groups: rawGroups, totalHeight: 0, scrubberEntries: [] };
    }

    const opts = {
      containerWidth: containerWidth - 32, // 16px padding each side
      targetRowHeight: TARGET_ROW_HEIGHT,
      gap: GAP,
      headerHeight: HEADER_HEIGHT,
      groupPaddingBottom: GROUP_PADDING_BOTTOM,
    };

    const computedGroups = [...rawGroups];
    const height = computeTimelineLayout(computedGroups, timelineItems, opts);
    return {
      groups: computedGroups,
      totalHeight: height,
      scrubberEntries: computeScrubberEntries(computedGroups, datePolicy),
    };
  }, [containerWidth, locale, timelineItems, timeZone]);

  // ── Virtual range state ───────────────────────────────────────────────────
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const lastScrollRef = useRef(0);
  const scrollTimerRef = useRef<number | null>(null);

  const virtualRange = useMemo(
    () =>
      computeVirtualRange(
        groups,
        { scrollTop, viewportHeight, overscan: OVERSCAN },
        totalHeight,
      ),
    [groups, scrollTop, viewportHeight, totalHeight],
  );

  // ── Scroll restoration ────────────────────────────────────────────────────
  const scrollKey = scrollRestorationKey(albumId, sortMode);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current || containerWidth <= 0 || groups.length === 0) return;
    restoredRef.current = true;
    const saved = loadScrollPosition(scrollKey);
    if (saved > 0 && containerRef.current) {
      // Defer to next frame so layout is ready
      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const documentTop = window.scrollY + container.getBoundingClientRect().top;
        window.scrollTo({ top: documentTop + saved, behavior: "instant" });
      });
    }
  }, [containerWidth, groups.length, scrollKey]);

  // ── Active month tracking for scrubber (computed during render) ───────────
  const activeMonthKey = useMemo(() => {
    const group = findGroupAtScrollTop(groups, scrollTop);
    return group ? group.monthKey : null;
  }, [groups, scrollTop]);

  // ── Scroll handler (throttled) ────────────────────────────────────────────
  const scrollTimelineTo = useCallback(
    (top: number, behavior: ScrollBehavior = "instant") => {
      const container = containerRef.current;
      if (!container) return;
      const documentTop = window.scrollY + container.getBoundingClientRect().top;
      window.scrollTo({ top: documentTop + top, behavior });
    },
    [],
  );

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    emitScrollBusy();
    const maxScroll = Math.max(0, totalHeight - window.innerHeight);
    const top = Math.max(0, Math.min(maxScroll, -container.getBoundingClientRect().top));
    lastScrollRef.current = top;
    if (scrollTimerRef.current !== null) return;
    scrollTimerRef.current = window.setTimeout(() => {
      scrollTimerRef.current = null;
      setScrollTop(lastScrollRef.current);
      saveScrollPosition(scrollKey, lastScrollRef.current);
    }, SCROLL_THROTTLE_MS);
  }, [scrollKey, totalHeight]);

  useEffect(() => {
    const update = () => {
      setViewportHeight(window.innerHeight);
      updateScrollState();
    };
    update();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", update);
    };
  }, [updateScrollState]);

  // ── Scrubber ──────────────────────────────────────────────────────────────
  const handleScrub = useCallback(
    (top: number) => {
      scrollTimelineTo(top, "smooth");
    },
    [scrollTimelineTo],
  );

  // ── Sort controls ─────────────────────────────────────────────────────────
  const chooseSortMode = useCallback(
    (value: MediaSortMode) => {
      startTransition(() => {
        setSortMode(value);
        try { window.localStorage.setItem(storageKey, value); } catch { /* ignore */ }
        setCurrentIndex(null);
        restoredRef.current = false; // allow scroll restoration recalc
        scrollTimelineTo(0);
      });
    },
    [scrollTimelineTo, storageKey],
  );

  const resetSortMode = useCallback(() => {
    startTransition(() => {
      setSortMode(defaultMode);
      try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
      setCurrentIndex(null);
      restoredRef.current = false;
      scrollTimelineTo(0);
    });
  }, [defaultMode, scrollTimelineTo, storageKey]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const sel = useSelectionController();

  const allEntries = useMemo(
    () => viewableMedia.map((item, idx) => ({ mediaId: item.id, mediaIndex: idx })),
    [viewableMedia],
  );

  const handleLongPress = useCallback(
    (mediaIndex: number) => {
      sel.toggle({ mediaId: viewableMedia[mediaIndex]?.id ?? "", mediaIndex });
    },
    [sel, viewableMedia],
  );

  const handleSelect = useCallback(
    (mediaIndex: number, shiftKey: boolean) => {
      const entry = { mediaId: viewableMedia[mediaIndex]?.id ?? "", mediaIndex };
      if (shiftKey) {
        sel.expandRange(entry, allEntries);
      } else {
        sel.toggle(entry);
      }
    },
    [sel, viewableMedia, allEntries],
  );

  const handleBulkDownload = useCallback(() => {
    const selected = new Set(sel.selectedIds());
    const ids = viewableMedia
      .filter(
        (item) =>
          selected.has(item.id) &&
          item.media_type === "image" &&
          item.download_allowed !== false,
      )
      .slice(0, 100)
      .map((item) => item.id);
    if (!ids.length) return;
    const params = new URLSearchParams({ media: ids.join(",") });
    const anchor = document.createElement("a");
    anchor.href = `/api/albums/${encodeURIComponent(albumId)}/download?${params}`;
    anchor.download = "";
    anchor.click();
    sel.clear();
  }, [albumId, sel, viewableMedia]);

  // ── Viewer Effects & Handlers ─────────────────────────────────────────────
  useEffect(() => {
    const syncViewerFromLocation = () => {
      const mediaId = new URL(window.location.href).searchParams.get("media");
      const index = viewerIndexFromMediaId(viewableMedia, mediaId);
      setHasOpenedViewer(index !== null);
      setCurrentIndex(index);
      if (index === null && openedFromTimelineRef.current) {
        openedFromTimelineRef.current = false;
        const savedScroll = scrollBeforeViewerRef.current;
        const savedIndex = focusedIndexBeforeViewerRef.current;
        requestAnimationFrame(() => {
          scrollTimelineTo(savedScroll);
          requestAnimationFrame(() => {
            document
              .querySelector<HTMLElement>(`[data-media-index="${savedIndex ?? ""}"]`)
              ?.focus();
          });
        });
      }
    };
    syncViewerFromLocation();
    window.addEventListener("popstate", syncViewerFromLocation);
    return () => window.removeEventListener("popstate", syncViewerFromLocation);
  }, [scrollTimelineTo, viewableMedia]);

  useEffect(() => {
    if (!hasOpenedViewer || currentIndex === null) return;
    const current = viewableMedia[currentIndex];
    if (!current) return;
    if (new URL(window.location.href).searchParams.get("media") === current.id) return;
    window.history.replaceState(
      window.history.state,
      "",
      viewerUrlForMedia(window.location.href, current.id),
    );
  }, [currentIndex, hasOpenedViewer, viewableMedia]);

  const openMedia = useCallback(
    (mediaIndex: number) => {
      const selected = viewableMedia[mediaIndex];
      if (!selected) return;
      // Save scroll position before opening viewer
      scrollBeforeViewerRef.current = containerRef.current
        ? Math.max(0, -containerRef.current.getBoundingClientRect().top)
        : scrollTop;
      focusedIndexBeforeViewerRef.current = mediaIndex;
      openedFromTimelineRef.current = true;
      window.history.pushState(
        { ...window.history.state, orianaMediaViewer: true },
        "",
        viewerUrlForMedia(window.location.href, selected.id),
      );
      setHasOpenedViewer(true);
      setCurrentIndex(mediaIndex);
    },
    [scrollTop, viewableMedia],
  );

  const closeViewer = useCallback(() => {
    if (openedFromTimelineRef.current && new URL(window.location.href).searchParams.has("media")) {
      openedFromTimelineRef.current = false;
      window.history.back();
      // Restore scroll after history navigation settles
      const savedScroll = scrollBeforeViewerRef.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollTimelineTo(savedScroll);
          document
            .querySelector<HTMLElement>(
              `[data-media-index="${focusedIndexBeforeViewerRef.current ?? ""}"]`,
            )
            ?.focus();
        });
      });
      return;
    }
    window.history.replaceState(
      window.history.state,
      "",
      viewerUrlWithoutMedia(window.location.href),
    );
    setCurrentIndex(null);
    setHasOpenedViewer(false);
    // Restore scroll
    const savedScroll = scrollBeforeViewerRef.current;
    requestAnimationFrame(() => {
      scrollTimelineTo(savedScroll);
      document
        .querySelector<HTMLElement>(
          `[data-media-index="${focusedIndexBeforeViewerRef.current ?? ""}"]`,
        )
        ?.focus();
    });
  }, [scrollTimelineTo]);

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

  // ── Keyboard shortcuts (M8) ───────────────────────────────────────────────
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Don't intercept when viewer is open or focus is in input/textarea
      if (currentIndex !== null) return;
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === "Escape") {
        if (sel.state.isActive) {
          event.preventDefault();
          sel.clear();
        }
      } else if ((event.metaKey || event.ctrlKey) && event.key === "a") {
        event.preventDefault();
        sel.selectAll(allEntries);
      }
    },
    [currentIndex, sel, allEntries],
  );

  // ── Empty state ───────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  const visibleGroups = virtualRange.visibleGroupIndices.map((i) => groups[i]).filter(Boolean) as DateGroup[];
  const timelineSortLabels = locale === "vi"
    ? {
        taken_desc: "Ngày chụp, mới nhất",
        taken_asc: "Ngày chụp, cũ nhất",
      }
    : mediaSortLabels;

  return (
    <section
      className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6 sm:pb-32"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <AlbumSearchFilter
        albumId={albumId}
        media={sortedMedia.filter(isMediaReadyForDelivery)}
        searchInputRef={searchInputRef}
        locale={locale}
        onFiltered={handleFilteredMedia}
      />

      {/* Sort controls */}
      <div className="mb-8 sm:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-text-secondary">
            {locale === "vi" ? "Dòng thời gian" : "Timeline order"}
          </span>
          {isPending && (
            <span className="text-[0.65rem] italic text-text-secondary/50">
              {locale === "vi" ? "Đang sắp xếp..." : "Curating..."}
            </span>
          )}
        </div>

        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          {TIMELINE_SORT_MODES.map((mode) => (
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
              {timelineSortLabels[mode]}
            </button>
          ))}
          <Button
            variant="icon"
            className="h-9 w-9 rounded-full text-text-secondary hover:text-text-primary"
            onClick={resetSortMode}
            aria-label={locale === "vi" ? "Đặt lại sắp xếp" : "Reset sort"}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid gap-2 lg:hidden w-full max-w-xs">
          <label className="sr-only" htmlFor={`album-sort-${albumId}`}>
            {locale === "vi" ? "Sắp xếp dòng thời gian" : "Sort timeline"}
          </label>
          <select
            id={`album-sort-${albumId}`}
            value={sortMode}
            onChange={(event) => chooseSortMode(parseMediaSortMode(event.target.value))}
            className="h-10 w-full rounded-full border border-border/40 bg-surface/30 px-4 text-[0.8rem] font-medium text-text-primary outline-none focus:border-text-primary/30 appearance-none"
          >
            {TIMELINE_SORT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {timelineSortLabels[mode]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sticky sort context bar: shows current date group on scroll */}
      <div id="media-timeline" className="relative">
        {/* Virtual scroll container */}
        <div
          ref={containerRef}
          className="relative min-h-[400px] w-full"
          aria-label="Photo timeline"
          role="region"
        >
          {/* Total height spacer */}
          <div style={{ height: totalHeight, position: "relative" }}>
            {/* Render only visible groups */}
            {visibleGroups.map((group) => (
              <div
                key={group.key}
                style={{ position: "absolute", top: group.top, left: 0, right: 32, width: "calc(100% - 32px)" }}
              >
                <TimelineDateGroup
                  group={group}
                  media={viewableMedia}
                  albumStatus={albumStatus}
                  downloadAllowed={downloadAllowed}
                  protectAssets={protectAssets}
                  onOpen={openMedia}
                  gap={GAP}
                  selectionActive={sel.state.isActive}
                  isSelected={sel.isSelected}
                  isRangeCandidate={sel.isRangeCandidate}
                  onSelect={handleSelect}
                  onLongPress={handleLongPress}
                />
              </div>
            ))}
          </div>

          {/* Scrubber (absolute right edge of container) */}
          {scrubberEntries.length > 1 && (
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8"
              aria-hidden="false"
            >
              <div className="pointer-events-auto sticky top-24 h-[calc(100vh-8rem)] w-8">
                <TimelineScrubber
                  entries={scrubberEntries as ScrubberEntry[]}
                  activeMonthKey={activeMonthKey}
                  onScrub={handleScrub}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Media count summary */}
      <div className="mt-6 text-center text-[0.65rem] font-medium uppercase tracking-widest text-text-secondary/50">
        {viewableMedia.length}{" "}
        {locale === "vi" ? "mục" : viewableMedia.length === 1 ? "item" : "items"}
        {sel.state.count > 0 && (
          <span className="ml-2 text-text-primary">
            · {sel.state.count} {locale === "vi" ? "đã chọn" : "selected"}
          </span>
        )}
      </div>

      {/* Selection action bar */}
      <SelectionActionBar
        count={sel.state.count}
        downloadAllowed={downloadAllowed}
        onDownload={handleBulkDownload}
        onSelectAll={() => sel.selectAll(allEntries)}
        onClear={sel.clear}
        locale={locale}
      />

      {/* Viewer */}
      {hasOpenedViewer && (
        <MediaViewer
          media={viewableMedia}
          currentIndex={currentIndex}
          downloadAllowed={downloadAllowed}
          albumStatus={albumStatus}
          protectAssets={protectAssets}
          onClose={closeViewer}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSelect={setCurrentIndex}
        />
      )}
    </section>
  );
}
