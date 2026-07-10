"use client";

import { useAlbumViewMemory } from "@/hooks/useAlbumViewMemory";
import { ArrowRight } from "lucide-react";

interface AlbumMemoryHintProps {
  albumId: string;
  dict?: any;
}

export function AlbumMemoryHint({ albumId, dict }: AlbumMemoryHintProps) {
  const { getAlbumViewState, isClient } = useAlbumViewMemory();
  const viewState = getAlbumViewState(albumId);

  if (!isClient) return null;
  if (!viewState.canContinue || !viewState.record?.lastMediaIndex) return null;

  return (
    <button
      onClick={() => {
        // Find the media item in the DOM and click it, or we could dispatch an event
        // The easiest way is to find the thumbnail by index and click it
        const thumbs = document.querySelectorAll("[data-media-index]");
        if (thumbs && thumbs.length > viewState.record!.lastMediaIndex!) {
          (thumbs[viewState.record!.lastMediaIndex!] as HTMLElement).click();
        } else {
          // Fallback if not found: scroll to grid
          document.getElementById("media-grid")?.scrollIntoView({ behavior: "smooth" });
        }
      }}
      className="mt-6 flex items-center gap-3 rounded-full border border-border/50 bg-surface/30 px-5 py-2.5 text-sm font-medium text-text-primary backdrop-blur-md transition-colors hover:bg-surface/60 hover:border-border"
    >
      <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
      {dict?.albums?.welcome_back || "Welcome back"}. {dict?.albums?.continue_from_photo || "Continue from photo"} {viewState.record.lastMediaIndex + 1}?
      <ArrowRight className="h-4 w-4 text-text-secondary" />
    </button>
  );
}
