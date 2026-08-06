"use client";

import { useEffect, useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getOrCreateClientId } from "@/lib/client-id";

interface AlbumLikeButtonProps {
  albumId: string;
  initialCount?: number;
}

export function AlbumLikeButton({ albumId, initialCount = 0 }: AlbumLikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLikeState = useCallback(async () => {
    try {
      const clientId = getOrCreateClientId();
      const response = await fetch(`/api/likes?albumId=${albumId}&clientId=${clientId}`);
      const payload = await response.json();
      if (payload.success) {
        setCount(payload.data.count);
        setLiked(payload.data.liked);
      }
    } catch {
      // Ignore network failures gracefully
    }
  }, [albumId]);

  useEffect(() => {
    void fetchLikeState();
  }, [fetchLikeState]);

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
        body: JSON.stringify({ albumId, clientId }),
      });
      const payload = await response.json();
      if (payload.success) {
        setCount(payload.data.count);
        setLiked(payload.data.liked);
      }
    } catch {
      // Ignore network failures gracefully
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant={liked ? "primary" : "secondary"}
      className="gap-2 transition-all duration-300 active:scale-95"
      onClick={toggleLike}
      disabled={isLoading}
      aria-label={liked ? "Unlike album" : "Like album"}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${
          liked ? "fill-current text-background" : "text-text-primary"
        }`}
        aria-hidden="true"
      />
      <span>{count > 0 ? `Like ${count}` : "Like"}</span>
    </Button>
  );
}
