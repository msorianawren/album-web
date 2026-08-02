"use client";

import { Badge } from "@/components/ui/Badge";
import { useAlbumViewMemory } from "@/hooks/useAlbumViewMemory";
import type { AppDictionary } from "@/lib/i18n";

export function AlbumViewBadge({ albumId, dict }: { albumId: string; dict?: AppDictionary }) {
  const { getAlbumViewState } = useAlbumViewMemory();
  const viewState = getAlbumViewState(albumId);

  if (viewState.isRecentlyViewed) {
    return (
      <div className="absolute left-2.5 top-8 sm:left-3 sm:top-9 z-10">
        <Badge className="bg-white/95 text-black backdrop-blur-md font-medium tracking-widest text-[0.55rem] uppercase border-none shadow-sm px-2 py-0.5">
          {dict?.albums?.recently_viewed || "Recently viewed"}
        </Badge>
      </div>
    );
  }

  if (viewState.isViewed) {
    return (
      <div className="absolute left-2.5 top-8 sm:left-3 sm:top-9 z-10">
        <Badge className="bg-black/50 text-white/95 backdrop-blur-md font-medium tracking-widest text-[0.55rem] uppercase border border-white/20 shadow-sm px-2 py-0.5">
          {dict?.albums?.viewed || "Viewed"}
        </Badge>
      </div>
    );
  }

  return null;
}
