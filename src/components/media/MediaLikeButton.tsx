"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getOrCreateClientId } from "@/lib/client-id";

interface MediaLikeButtonProps {
  mediaId: string;
  compact?: boolean;
}

export function MediaLikeButton({ mediaId, compact }: MediaLikeButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const clientId = getOrCreateClientId();
    fetch(`/api/likes?mediaId=${mediaId}&clientId=${clientId}`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) {
          setCount(payload.data.count);
          setLiked(payload.data.liked);
        }
      })
      .catch(() => undefined);
  }, [mediaId]);

  async function toggleLike() {
    if (isLoading) return;
    setIsLoading(true);
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
    }
    setIsLoading(false);
  }

  return (
    <Button
      variant={compact ? "icon" : "secondary"}
      className={
        compact
          ? "h-9 w-9 border-lightbox-border bg-lightbox-control text-accent-foreground"
          : undefined
      }
      onClick={toggleLike}
      disabled={isLoading}
      aria-label={liked ? "Unlike media" : "Like media"}
    >
      <Heart
        className={liked ? "h-4 w-4 fill-current text-text-primary" : "h-4 w-4"}
        aria-hidden="true"
      />
      {!compact ? <span>{count}</span> : null}
    </Button>
  );
}
