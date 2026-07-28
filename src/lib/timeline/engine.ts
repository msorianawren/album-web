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
  TimelineDatePolicy,
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
const DEFAULT_DATE_POLICY: TimelineDatePolicy = {
  locale: "en",
  timeZone: "UTC",
};

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

function datePartsInTimeZone(
  date: Date,
  policy: TimelineDatePolicy,
): { year: number; month: number; day: number } {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: policy.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_DATE_POLICY.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function toDateGroupKey(parts: { year: number; month: number; day: number }): DateGroupKey {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function toMonthKey(parts: { year: number; month: number }): MonthKey {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

function parseCalendarKey(key: string, expectedParts: 2 | 3): number[] | null {
  const parts = key.split("-").map(Number);
  if (
    parts.length !== expectedParts ||
    !parts.every(Number.isInteger) ||
    parts[0] < 1 ||
    parts[1] < 1 ||
    parts[1] > 12 ||
    (expectedParts === 3 && (parts[2] < 1 || parts[2] > 31))
  ) {
    return null;
  }
  return parts;
}

/** Format a group header label from a DateGroupKey. */
export function formatGroupLabel(
  key: DateGroupKey,
  policy: TimelineDatePolicy = DEFAULT_DATE_POLICY,
): string {
  const parts = parseCalendarKey(key, 3);
  if (!parts) return key;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return key;
  }
  return new Intl.DateTimeFormat(policy.locale, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatGroupShortLabel(
  key: DateGroupKey,
  policy: TimelineDatePolicy = DEFAULT_DATE_POLICY,
): string {
  const parts = parseCalendarKey(key, 3);
  if (!parts) return key;
  const [year, month, day] = parts;
  return new Intl.DateTimeFormat(policy.locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatMonthLabel(
  monthKey: MonthKey,
  policy: TimelineDatePolicy = DEFAULT_DATE_POLICY,
): string {
  const parts = parseCalendarKey(monthKey, 2);
  if (!parts) return monthKey;
  const [year, month] = parts;
  return new Intl.DateTimeFormat(policy.locale, {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Group an ordered media array by calendar day using one explicit timezone.
 * Assumes media is already sorted in the desired order; groups preserve that order.
 */
export function groupMediaByDate(
  media: TimelineMediaItem[],
  policy: TimelineDatePolicy = DEFAULT_DATE_POLICY,
): DateGroup[] {
  const groupMap = new Map<DateGroupKey, DateGroup>();
  const groupOrder: DateGroupKey[] = [];

  for (const item of media) {
    const d = resolveSortDate(item);
    const dateParts = datePartsInTimeZone(d, policy);
    const key = toDateGroupKey(dateParts);

    if (!groupMap.has(key)) {
      const monthKey = toMonthKey(dateParts);
      groupMap.set(key, {
        key,
        label: formatGroupLabel(key, policy),
        shortLabel: formatGroupShortLabel(key, policy),
        monthKey,
        year: dateParts.year,
        month: dateParts.month,
        day: dateParts.day,
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
export function computeScrubberEntries(
  groups: DateGroup[],
  policy: TimelineDatePolicy = DEFAULT_DATE_POLICY,
): ScrubberEntry[] {
  const monthMap = new Map<MonthKey, ScrubberEntry>();
  const monthOrder: MonthKey[] = [];

  for (const group of groups) {
    const { monthKey } = group;
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        label: formatMonthLabel(monthKey, policy),
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
