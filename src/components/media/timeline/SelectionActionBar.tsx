"use client";

import { memo } from "react";
import { Download, X } from "lucide-react";

interface SelectionActionBarProps {
  count: number;
  downloadAllowed: boolean;
  onDownload: () => void;
  onClear: () => void;
}

/**
 * Floating action bar that appears when items are selected in the timeline.
 * Behaviorally informed by Immich v3.0.3's asset-selection-viewer pattern.
 */
export const SelectionActionBar = memo(function SelectionActionBar({
  count,
  downloadAllowed,
  onDownload,
  onClear,
}: SelectionActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border/30 bg-background/95 px-5 py-3 shadow-2xl backdrop-blur-md"
      role="toolbar"
      aria-label="Selection actions"
    >
      {/* Count badge */}
      <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-text-primary px-2 text-[0.65rem] font-bold text-background tabular-nums">
        {count}
      </span>
      <span className="text-[0.7rem] font-medium text-text-secondary">
        {count === 1 ? "item selected" : "items selected"}
      </span>

      <div className="mx-1 h-4 w-px bg-border/40" aria-hidden="true" />

      {/* Download */}
      {downloadAllowed && (
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.7rem] font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/30"
          aria-label={`Download ${count} ${count === 1 ? "item" : "items"}`}
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      )}

      {/* Clear */}
      <button
        type="button"
        onClick={onClear}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.7rem] font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/30"
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
        Clear
      </button>
    </div>
  );
});
