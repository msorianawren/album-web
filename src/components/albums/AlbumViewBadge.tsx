"use client";

import { Badge } from "@/components/ui/Badge";
import { useAlbumViewMemory } from "@/hooks/useAlbumViewMemory";
import type { AppDictionary } from "@/lib/i18n";

export function AlbumViewBadge({ albumId, dict }: { albumId: string; dict?: AppDictionary }) {
  const { getAlbumViewState } = useAlbumViewMemory();
  const viewState = getAlbumViewState(albumId);

  if (viewState.isRecentlyViewed) {
    return (
      <div className="absolute left-4 top-12 mt-2">
        <Badge className="bg-white/90 text-black backdrop-blur-md font-medium tracking-widest text-[0.6rem] uppercase border-none shadow-sm">
          {dict?.albums?.recently_viewed || "Recently viewed"}
        </Badge>
      </div>
    );
  }

  if (viewState.isViewed) {
    return (
      <div className="absolute left-4 top-12 mt-2">
        <Badge className="bg-black/40 text-white/90 backdrop-blur-md font-medium tracking-widest text-[0.6rem] uppercase border border-white/20 shadow-sm">
          {dict?.albums?.viewed || "Viewed"}
        </Badge>
      </div>
    );
  }

  return null;
}
