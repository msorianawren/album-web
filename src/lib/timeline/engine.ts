/**
 * Oriana Wren – Immich-grade album timeline engine.
 *
 * Pure TypeScript. Zero React, zero Supabase, zero Svelte dependencies.
 *
 * Behavioral design informed by Immich v3.0.3 (cd308ad):
 *   web/src/lib/managers/timeline-manager/timeline-manager.svelte.ts
 *   web/src/lib/managers/timeline-manager/timeline-month.svelte.ts
 *   web/src/lib/managers/timeline-manager/internal/layout-support.svelte.ts
 *   web/src/lib/managers/timeline-manager/internal/intersection-support.svelte.ts
 *   web/src/lib/managers/timeline-manager/internal/search-support.svelte.ts
 *
 * Key differences from Immich:
 *   - React/Next.js context instead of Svelte stores.
 *   - Album-scoped only (no global timeline).
 *   - No server-side time-bucket API; groups from client-provided media array.
 *   - Groups by calendar day using sort_date → taken_at → created_at.
 *   - Justified row layout (Immich-grade aspect-ratio-preserving rows).
 */

import type {
  DateGroup,
  DateGroupKey,
  MonthKey,
  RowLayout,
  ScrubberEntry,
  ThumbnailCell,
  TimelineLayoutOptions,
  TimelineMediaItem,
  VirtualRange,
  VirtualScrollOptions,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TARGET_ROW_HEIGHT = 220;
const DEFAULT_GAP = 4;
const DEFAULT_HEADER_HEIGHT = 44;
const DEFAULT_GROUP_PADDING_BOTTOM = 24;
const DEFAULT_OVERSCAN = 2;
const MIN_CELL_WIDTH = 80;
const MIN_ASPECT_RATIO = 0.25; // taller than 4:1 portrait
const MAX_ASPECT_RATIO = 4.0; // wider than 4:1 landscape
const FALLBACK_ASPECT_RATIO = 4 / 3;

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

/** Extract the best grouping date from a media item. */
function resolveSortDate(item: TimelineMediaItem): Date {
  const raw = item.sortDate;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function toDateGroupKey(d: Date): DateGroupKey {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toMonthKey(d: Date): MonthKey {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a group header label from a DateGroupKey. */
export function formatGroupLabel(key: DateGroupKey): string {
  // key is "YYYY-MM-DD"
  const parts = key.split("-");
  if (parts.length !== 3) return key;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1; // 0-indexed
  const d = Number(parts[2]);
  if (!Number.isInteger(y) || !Number.isInteger(m + 1) || !Number.isInteger(d) ||
      m < 0 || m > 11 || d < 1 || d > 31) {
    return key;
  }
  // Reconstruct as UTC date to match key derivation
  const date = new Date(Date.UTC(y, m, d));
  const dow = DAY_NAMES[date.getUTCDay()];
  const monthName = MONTH_NAMES[m];
  return `${dow}, ${d} ${monthName} ${y}`;
}

export function formatGroupShortLabel(key: DateGroupKey): string {
  const parts = key.split("-");
  if (parts.length !== 3) return key;
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  const y = parts[0];
  return `${d} ${MONTH_SHORT[m]} ${y}`;
}

export function formatMonthLabel(monthKey: MonthKey): string {
  const parts = monthKey.split("-");
  if (parts.length !== 2) return monthKey;
  const m = Number(parts[1]) - 1;
  const y = parts[0];
  return `${MONTH_NAMES[m]} ${y}`;
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Group an ordered media array by calendar day (UTC).
 * Assumes media is already sorted in the desired order; groups preserve that order.
 */
export function groupMediaByDate(media: TimelineMediaItem[]): DateGroup[] {
  const groupMap = new Map<DateGroupKey, DateGroup>();
  const groupOrder: DateGroupKey[] = [];

  for (const item of media) {
    const d = resolveSortDate(item);
    const key = toDateGroupKey(d);

    if (!groupMap.has(key)) {
      const monthKey = toMonthKey(d);
      groupMap.set(key, {
        key,
        label: formatGroupLabel(key),
        shortLabel: formatGroupShortLabel(key),
        monthKey,
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        mediaIndices: [],
        rows: [],
        height: 0,
        top: 0,
        layoutReady: false,
      });
      groupOrder.push(key);
    }

    const group = groupMap.get(key)!;
    group.mediaIndices.push(item.mediaIndex);
  }

  return groupOrder.map((key) => groupMap.get(key)!);
}

// ---------------------------------------------------------------------------
// Justified layout
// ---------------------------------------------------------------------------

/**
 * Compute the safe aspect ratio for a cell, clamped to sensible bounds.
 */
function safeAspectRatio(item: TimelineMediaItem): number {
  const ar = item.aspectRatio ?? (
    item.width && item.height && item.height > 0
      ? item.width / item.height
      : null
  );
  if (!ar || !Number.isFinite(ar) || ar <= 0) return FALLBACK_ASPECT_RATIO;
  return Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, ar));
}

/**
 * Immich-grade justified row layout.
 *
 * Behavioral design informed by:
 *   immich-reference/web/src/lib/managers/timeline-manager/internal/layout-support.svelte.ts
 *
 * Algorithm:
 *   1. Greedily add cells to the current row until the natural row width
 *      (cells × targetRowHeight × aspectRatio + gaps) meets or exceeds containerWidth.
 *   2. Scale the row so its total width equals containerWidth exactly.
 *   3. Last row: if fewer cells than average, render at natural height (no stretching).
 */
export function computeJustifiedLayout(
  mediaItems: TimelineMediaItem[],
  options: TimelineLayoutOptions,
): RowLayout[] {
  const {
    containerWidth,
    targetRowHeight = DEFAULT_TARGET_ROW_HEIGHT,
    gap = DEFAULT_GAP,
    headerHeight = DEFAULT_HEADER_HEIGHT,
  } = options;

  if (containerWidth <= 0 || mediaItems.length === 0) return [];

  const rows: RowLayout[] = [];
  let currentRow: { item: TimelineMediaItem; ar: number }[] = [];
  let cumulativeTop = headerHeight;

  const flushRow = (isLastRow: boolean) => {
    if (currentRow.length === 0) return;

    const totalNaturalWidth = currentRow.reduce(
      (sum, { ar }) => sum + ar * targetRowHeight,
      0,
    ) + gap * (currentRow.length - 1);

    let rowHeight: number;
    let scaleFactor: number;

    if (isLastRow && totalNaturalWidth < containerWidth * 0.85) {
      // Last partial row: don't stretch, use target height
      rowHeight = targetRowHeight;
      scaleFactor = 1;
    } else {
      // Scale so total width = containerWidth (minus outer gaps)
      const availableWidth = containerWidth;
      scaleFactor = (availableWidth - gap * (currentRow.length - 1)) /
        (currentRow.reduce((sum, { ar }) => sum + ar * targetRowHeight, 0));
      rowHeight = Math.round(targetRowHeight * scaleFactor);
    }

    rowHeight = Math.max(rowHeight, MIN_CELL_WIDTH);

    const cells: ThumbnailCell[] = [];
    let left = 0;
    for (let i = 0; i < currentRow.length; i++) {
      const { item, ar } = currentRow[i];
      const cellWidth = i < currentRow.length - 1
        ? Math.round(ar * rowHeight)
        : Math.max(MIN_CELL_WIDTH, containerWidth - left);

      cells.push({
        mediaId: item.id,
        width: cellWidth,
        height: rowHeight,
        left,
        aspectRatio: ar,
        mediaIndex: item.mediaIndex,
      });
      left += cellWidth + gap;
    }

    rows.push({
      rowIndex: rows.length,
      cells,
      height: rowHeight + gap,
      top: cumulativeTop,
    });
    cumulativeTop += rowHeight + gap;
    currentRow = [];
  };

  for (let i = 0; i < mediaItems.length; i++) {
    const item = mediaItems[i];
    const ar = safeAspectRatio(item);
    currentRow.push({ item, ar });

    // Calculate natural width of current row
    const naturalWidth = currentRow.reduce(
      (sum, { ar: a }) => sum + a * targetRowHeight,
      0,
    ) + gap * (currentRow.length - 1);

    const isLast = i === mediaItems.length - 1;
    if (naturalWidth >= containerWidth || isLast) {
      flushRow(isLast && naturalWidth < containerWidth * 0.85);
    }
  }

  // If last flush left currentRow non-empty (shouldn't happen, but safety)
  if (currentRow.length > 0) flushRow(true);

  return rows;
}

// ---------------------------------------------------------------------------
// Full layout: compute rows and cumulative tops for all groups
// ---------------------------------------------------------------------------

/**
 * Compute pixel layout for all date groups given a container width.
 * Mutates groups in place (sets rows, height, top).
 * Returns the total timeline height.
 */
export function computeTimelineLayout(
  groups: DateGroup[],
  media: TimelineMediaItem[],
  options: TimelineLayoutOptions,
): number {
  const {
    headerHeight = DEFAULT_HEADER_HEIGHT,
    groupPaddingBottom = DEFAULT_GROUP_PADDING_BOTTOM,
  } = options;

  let cumulativeTop = 0;

  for (const group of groups) {
    group.top = cumulativeTop;

    const groupMedia = group.mediaIndices.map((idx) => media[idx]).filter(Boolean);
    const rows = computeJustifiedLayout(groupMedia, { ...options, headerHeight });
    group.rows = rows;

    const rowsHeight = rows.reduce((sum, row) => sum + row.height, 0);
    group.height = headerHeight + rowsHeight + groupPaddingBottom;
    group.layoutReady = true;

    cumulativeTop += group.height;
  }

  return cumulativeTop;
}

// ---------------------------------------------------------------------------
// Virtual range computation
// ---------------------------------------------------------------------------

/**
 * Given current scrollTop and viewportHeight, return the indices of DateGroups
 * that should be rendered (with overscan).
 *
 * Behavioral design informed by:
 *   immich-reference/web/src/lib/managers/VirtualScrollManager/VirtualScrollManager.svelte.ts
 */
export function computeVirtualRange(
  groups: DateGroup[],
  options: VirtualScrollOptions,
  totalHeight: number,
): VirtualRange {
  const { scrollTop, viewportHeight, overscan = DEFAULT_OVERSCAN } = options;

  if (groups.length === 0) {
    return { visibleGroupIndices: [], totalHeight };
  }

  const viewStart = scrollTop;
  const viewEnd = scrollTop + viewportHeight;

  let firstVisible = -1;
  let lastVisible = -1;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupTop = group.top;
    const groupBottom = groupTop + group.height;

    if (groupBottom > viewStart && groupTop < viewEnd) {
      if (firstVisible === -1) firstVisible = i;
      lastVisible = i;
    }
  }

  if (firstVisible === -1) {
    // Nothing visible; return groups nearest to viewport
    return { visibleGroupIndices: [], totalHeight };
  }

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(groups.length - 1, lastVisible + overscan);

  const visibleGroupIndices: number[] = [];
  for (let i = start; i <= end; i++) {
    visibleGroupIndices.push(i);
  }

  return { visibleGroupIndices, totalHeight };
}

// ---------------------------------------------------------------------------
// Scrubber entries
// ---------------------------------------------------------------------------

/**
 * Derive scrubber entries (one per month) from date groups.
 * Used by TimelineScrubber to render month labels and jump targets.
 */
export function computeScrubberEntries(groups: DateGroup[]): ScrubberEntry[] {
  const monthMap = new Map<MonthKey, ScrubberEntry>();
  const monthOrder: MonthKey[] = [];

  for (const group of groups) {
    const { monthKey } = group;
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        label: formatMonthLabel(monthKey),
        monthKey,
        top: group.top,
        count: 0,
      });
      monthOrder.push(monthKey);
    }
    const entry = monthMap.get(monthKey)!;
    entry.count += group.mediaIndices.length;
  }

  return monthOrder.map((key) => monthMap.get(key)!);
}

// ---------------------------------------------------------------------------
// Scroll restoration key
// ---------------------------------------------------------------------------

export function scrollRestorationKey(albumId: string, sortMode: string): string {
  return `oriana:timeline-scroll:${albumId}:${sortMode}`;
}

export function saveScrollPosition(key: string, top: number): void {
  try {
    sessionStorage.setItem(key, String(Math.round(top)));
  } catch {
    // Private browsing
  }
}

export function loadScrollPosition(key: string): number {
  try {
    const raw = sessionStorage.getItem(key);
    const value = raw !== null ? Number(raw) : NaN;
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Find group for a media index
// ---------------------------------------------------------------------------

export function findGroupForMediaIndex(
  groups: DateGroup[],
  mediaIndex: number,
): DateGroup | null {
  for (const group of groups) {
    if (group.mediaIndices.includes(mediaIndex)) return group;
  }
  return null;
}

/**
 * Find the first date group at or after a given pixel scroll position.
 * Used by the scrubber to determine which month is currently in view.
 */
export function findGroupAtScrollTop(
  groups: DateGroup[],
  scrollTop: number,
): DateGroup | null {
  let best: DateGroup | null = null;
  for (const group of groups) {
    if (group.top <= scrollTop) {
      best = group;
    } else {
      break;
    }
  }
  return best;
}
