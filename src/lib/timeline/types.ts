/**
 * Oriana Wren – Immich-grade album timeline: shared types.
 *
 * Behavioral design informed by Immich v3.0.3 (cd308ad):
 *   web/src/lib/managers/timeline-manager/types.ts
 *   web/src/lib/managers/timeline-manager/timeline-month.svelte.ts
 *
 * All types are Oriana-native; no Svelte or Immich SDK imports.
 */

export type DateGroupKey = string; // "YYYY-MM-DD"
export type MonthKey = string; // "YYYY-MM"

/** A single thumbnail cell within a justified row. */
export interface ThumbnailCell {
  mediaId: string;
  /** Computed pixel width within this row. */
  width: number;
  /** Uniform row height for this row. */
  height: number;
  /** Left offset within the row container. */
  left: number;
  /** Aspect ratio (width / height) of the original media. */
  aspectRatio: number;
  /** Index within the album's viewable media array. */
  mediaIndex: number;
}

/** One horizontal row within a date group. */
export interface RowLayout {
  rowIndex: number;
  cells: ThumbnailCell[];
  /** Pixel height of this row (including bottom gap). */
  height: number;
  /** Cumulative top offset within this date group. */
  top: number;
}

/** One date group (e.g. a single calendar day). */
export interface DateGroup {
  key: DateGroupKey;
  /** Display label, e.g. "Monday, 28 July 2026" */
  label: string;
  /** Short label used when space is tight */
  shortLabel: string;
  monthKey: MonthKey;
  year: number;
  month: number; // 1–12
  day: number; // 1–31
  /** Indices into the sorted media array for this group. */
  mediaIndices: number[];
  /** Layout rows, populated lazily. */
  rows: RowLayout[];
  /** Total pixel height of this group including header. */
  height: number;
  /** Cumulative top offset within the full timeline. */
  top: number;
  /** Whether layout has been computed. */
  layoutReady: boolean;
}

/** Entry in the scrubber sidebar. */
export interface ScrubberEntry {
  /** "January 2026" */
  label: string;
  monthKey: MonthKey;
  /** Cumulative top of the first date group in this month. */
  top: number;
  /** Count of media in this month. */
  count: number;
}

/** Result of virtualRange computation. */
export interface VirtualRange {
  /** Indices of DateGroups that should be rendered. */
  visibleGroupIndices: number[];
  /** Total scrollable height in pixels. */
  totalHeight: number;
}

/** Lightweight media descriptor needed by the timeline engine. */
export interface TimelineMediaItem {
  id: string;
  mediaIndex: number;
  /** ISO 8601 date string used for grouping. Falls back to created_at. */
  sortDate: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  mediaType: "image" | "video";
}

/** Layout options. */
export interface TimelineLayoutOptions {
  containerWidth: number;
  /** Target row height in pixels. Default 220. */
  targetRowHeight?: number;
  /** Gap between cells and rows in pixels. Default 4. */
  gap?: number;
  /** Pixel height of a group date header. Default 44. */
  headerHeight?: number;
  /** Bottom padding of the last group. Default 32. */
  groupPaddingBottom?: number;
}

/** Virtual scroll options. */
export interface VirtualScrollOptions {
  scrollTop: number;
  viewportHeight: number;
  overscan?: number; // default 2 groups above/below
}
