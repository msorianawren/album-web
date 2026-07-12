"use client";

import { useEffect } from "react";
import { useAlbumViewMemory } from "@/hooks/useAlbumViewMemory";

interface AlbumViewTrackerProps {
  albumId: string;
  slug: string;
  locked: boolean;
}

export function AlbumViewTracker({ albumId, slug, locked }: AlbumViewTrackerProps) {
  const { markAlbumViewed } = useAlbumViewMemory();

  useEffect(() => {
    // Only track accessible albums
    if (locked) return;

    // Track immediately on mount but debounce for a few seconds to avoid bounces
    const localTimer = setTimeout(() => {
      markAlbumViewed({ albumId, slug });
    }, 5000); // 5 seconds

    // Track to server after 8 seconds of engagement
    const serverTimer = setTimeout(() => {
      fetch(`/api/albums/${albumId}/view-event`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "album_page" })
      }).catch(console.error); // Silently fail for guests or network errors
    }, 8000);

    return () => {
      clearTimeout(localTimer);
      clearTimeout(serverTimer);
    };
  }, [albumId, slug, locked, markAlbumViewed]);

  return null;
}
