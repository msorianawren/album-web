"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getOrCreateClientId } from "@/lib/client-id";
import { useI18n } from "@/lib/i18n-client";

interface MediaLikeButtonProps {
  mediaId: string;
  compact?: boolean;
}

export function MediaLikeButton({ mediaId, compact }: MediaLikeButtonProps) {
  const { t } = useI18n();
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
      aria-label={liked ? t("media.unlike") : t("media.likeMedia")}
    >
      <Heart
        className={liked ? "h-4 w-4 fill-current" : "h-4 w-4"}
        aria-hidden="true"
      />
      {!compact ? <span>{count > 0 ? `${t("media.like")} ${count}` : t("media.like")}</span> : null}
    </Button>
  );
}
