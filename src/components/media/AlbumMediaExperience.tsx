"use client";

import { useEffect, useState } from "react";
import { MediaGrid } from "@/components/media/MediaGrid";
import { MediaTimeline } from "@/components/media/timeline/MediaTimeline";
import type { AlbumStatus, Media } from "@/lib/types";

type AlbumViewMode = "timeline" | "curated";

interface AlbumMediaExperienceProps {
  albumId: string;
  media: Media[];
  downloadAllowed: boolean;
  albumStatus: AlbumStatus;
  protectAssets?: boolean;
  defaultSortMode?: string | null;
  locale?: "en" | "vi";
  timeZone?: string;
}

export function AlbumMediaExperience({
  albumId,
  media,
  downloadAllowed,
  albumStatus,
  protectAssets = false,
  defaultSortMode = "smart",
  locale = "en",
  timeZone = "Asia/Ho_Chi_Minh",
}: AlbumMediaExperienceProps) {
  const storageKey = `album:${albumId}:view-mode`;
  const [viewMode, setViewMode] = useState<AlbumViewMode>("timeline");

  useEffect(() => {
    let timer = 0;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "timeline" || stored === "curated") {
        timer = window.setTimeout(() => setViewMode(stored), 0);
      }
    } catch {
      // The view remains usable when browser storage is unavailable.
    }
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const chooseView = (next: AlbumViewMode) => {
    setViewMode(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // Session persistence is optional.
    }
  };

  return (
    <>
      <div
        className="mx-auto mb-6 flex w-full max-w-[1200px] items-center gap-1 px-4 sm:px-6"
        role="group"
        aria-label={locale === "vi" ? "Kiểu xem album" : "Album view"}
      >
        {(["timeline", "curated"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => chooseView(mode)}
            className={`rounded-full px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] transition-colors ${
              viewMode === mode
                ? "bg-text-primary text-background"
                : "bg-surface/30 text-text-secondary hover:bg-surface hover:text-text-primary"
            }`}
            aria-pressed={viewMode === mode}
          >
            {locale === "vi"
              ? mode === "timeline" ? "Theo thời gian" : "Bố cục tuyển chọn"
              : mode === "timeline" ? "Timeline" : "Curated grid"}
          </button>
        ))}
      </div>

      {viewMode === "timeline" ? (
        <MediaTimeline
          albumId={albumId}
          media={media}
          albumStatus={albumStatus}
          downloadAllowed={downloadAllowed}
          protectAssets={protectAssets}
          defaultSortMode="taken_desc"
          locale={locale}
          timeZone={timeZone}
        />
      ) : (
        <MediaGrid
          albumId={albumId}
          media={media}
          albumStatus={albumStatus}
          downloadAllowed={downloadAllowed}
          protectAssets={protectAssets}
          defaultSortMode={defaultSortMode}
        />
      )}
    </>
  );
}
