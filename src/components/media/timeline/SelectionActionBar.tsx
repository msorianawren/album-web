"use client";

import { memo } from "react";
import { Download, X, CheckSquare } from "lucide-react";

interface SelectionActionBarProps {
  count: number;
  downloadAllowed: boolean;
  onDownload: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  locale?: "en" | "vi";
}

/**
 * Floating action bar that appears when items are selected in the timeline.
 * Behaviorally informed by Immich v3.0.3's asset-selection-viewer pattern.
 */
export const SelectionActionBar = memo(function SelectionActionBar({
  count,
  downloadAllowed,
  onDownload,
  onSelectAll,
  onClear,
  locale = "en",
}: SelectionActionBarProps) {
  if (count === 0) return null;

  const isVi = locale === "vi";

  return (
    <div
      className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 sm:gap-2.5 rounded-full border border-border/40 bg-background/95 p-1.5 pl-3 sm:px-5 sm:py-3 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out"
      role="toolbar"
      aria-label="Selection actions"
    >
      {/* Count badge & label */}
      <div className="flex items-center gap-1.5 shrink-0 pr-0.5">
        <span className="flex h-5 min-w-[1.25rem] sm:h-6 sm:min-w-[1.5rem] items-center justify-center rounded-full bg-text-primary px-1.5 sm:px-2 text-[0.6rem] sm:text-[0.65rem] font-bold text-background tabular-nums">
          {count}
        </span>
        <span className="text-[0.65rem] sm:text-[0.7rem] font-semibold text-text-primary whitespace-nowrap">
          {isVi
            ? `${count} mục`
            : count === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="h-3.5 sm:h-4 w-px bg-border/40 shrink-0" aria-hidden="true" />

      {/* Buttons */}
      <div className="flex items-center gap-0.5 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={onSelectAll}
          className="flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 sm:px-3 sm:py-1.5 text-[0.65rem] sm:text-[0.7rem] font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/30 active:scale-95"
        >
          <CheckSquare className="h-3 w-3 sm:hidden" aria-hidden="true" />
          <span>{isVi ? "Chọn tất cả" : "Select all"}</span>
        </button>

        {/* Download */}
        {downloadAllowed && (
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 sm:px-3 sm:py-1.5 text-[0.65rem] sm:text-[0.7rem] font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/30 active:scale-95"
            aria-label={isVi
              ? `Tải xuống ${count} mục`
              : `Download ${count} ${count === 1 ? "item" : "items"}`}
          >
            <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            <span>{isVi ? "Tải xuống" : "Download"}</span>
          </button>
        )}

        {/* Clear */}
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 sm:px-3 sm:py-1.5 text-[0.65rem] sm:text-[0.7rem] font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/30 active:scale-95"
          aria-label={isVi ? "Bỏ chọn tất cả" : "Clear selection"}
        >
          <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          <span>{isVi ? "Bỏ chọn" : "Clear"}</span>
        </button>
      </div>
    </div>
  );
});
