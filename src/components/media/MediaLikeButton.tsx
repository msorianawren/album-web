"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getOrCreateClientId } from "@/lib/client-id";

interface MediaLikeButtonProps {
  mediaId: string;
  compact?: boolean;
}

const likeCache = new Map<string, { count: number; liked: boolean }>();

export function MediaLikeButton({ mediaId, compact }: MediaLikeButtonProps) {
  const [count, setCount] = useState(() => likeCache.get(mediaId)?.count ?? 0);
  const [liked, setLiked] = useState(() => likeCache.get(mediaId)?.liked ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(likeCache.has(mediaId));

  const fetchLikeState = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    try {
      const clientId = getOrCreateClientId();
      const response = await fetch(`/api/likes?mediaId=${mediaId}&clientId=${clientId}`);
      const payload = await response.json();
      if (payload.success) {
        setCount(payload.data.count);
        setLiked(payload.data.liked);
        likeCache.set(mediaId, { count: payload.data.count, liked: payload.data.liked });
      }
    } catch {
      fetchedRef.current = false;
    }
  }, [mediaId]);

  useEffect(() => {
    // Only fetch automatically if NOT compact (e.g. in full Viewer with count text),
    // or if already cached. Compact cards defer fetching to hover/interaction to save 50+ DB queries.
    if (!compact || likeCache.has(mediaId)) {
      void fetchLikeState();
    }
  }, [compact, fetchLikeState, mediaId]);

  async function toggleLike(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isLoading) return;
    setIsLoading(true);
    try {
      const clientId = getOrCreateClientId();
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, clientId }),
      });
      const payload = await response.json();
      if (payload.success) {
        setCount(payload.data.count);
        setLiked(payload.data.liked);
        likeCache.set(mediaId, { count: payload.data.count, liked: payload.data.liked });
        fetchedRef.current = true;
      }
    } catch {
      // Ignore network errors
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant={compact ? "icon" : "secondary"}
      className={
        compact
          ? "h-9 w-9 border-lightbox-border bg-lightbox-control text-accent-foreground transition-transform active:scale-90"
          : undefined
      }
      onClick={toggleLike}
      onMouseEnter={compact ? fetchLikeState : undefined}
      onFocus={compact ? fetchLikeState : undefined}
      disabled={isLoading}
      aria-label={liked ? "Unlike media" : "Like media"}
    >
      <Heart
        className={liked ? "h-4 w-4 fill-rose-500 text-rose-500" : "h-4 w-4"}
        aria-hidden="true"
      />
      {!compact ? <span>{count > 0 ? `Like ${count}` : "Like"}</span> : null}
    </Button>
  );
}
