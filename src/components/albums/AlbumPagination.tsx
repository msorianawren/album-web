"use client";

import { useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { loadMoreAlbumsAction } from "@/app/albums/actions";
import type { AlbumStatus } from "@/lib/types";

export function AlbumPagination({
  status,
  limit,
  q,
  initialHasMore,
  initialNextCursor,
}: {
  status: AlbumStatus;
  limit: number;
  q: string;
  initialHasMore: boolean;
  initialNextCursor?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadedAlbums, setLoadedAlbums] = useState<ReactNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError(null);

    try {
      const result = await loadMoreAlbumsAction(status, limit, nextCursor, q);
      setLoadedAlbums((prev) => [...prev, ...result.albums]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (e) {
      setError("More albums could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loadedAlbums.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {loadedAlbums}
        </div>
      )}
      
      {hasMore && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="secondary"
            disabled={loading}
            onClick={loadMore}
            className="min-w-44"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Loading" : "Load more"}
          </Button>
        </div>
      )}

      {error && <p className="mt-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
    </>
  );
}
