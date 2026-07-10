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
    const timer = setTimeout(() => {
      markAlbumViewed({ albumId, slug });
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [albumId, slug, locked, markAlbumViewed]);

  return null;
}
