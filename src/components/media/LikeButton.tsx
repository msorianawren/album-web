"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getOrCreateClientId } from "@/lib/client-id";
import { useI18n } from "@/lib/i18n-client";

interface LikeButtonProps {
  albumId: string;
}

export function LikeButton({ albumId }: LikeButtonProps) {
  const { t } = useI18n();
  const [count, setCount] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const clientId = getOrCreateClientId();
    fetch(`/api/likes?albumId=${albumId}&clientId=${clientId}`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) {
          setCount(payload.data.count);
          setLiked(payload.data.liked);
        }
      })
      .catch(() => undefined);
  }, [albumId]);

  async function likeAlbum() {
    if (isLoading) return;
    setIsLoading(true);
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
    setIsLoading(false);
  }

  return (
    <Button variant="secondary" onClick={likeAlbum} disabled={isLoading}>
      <Heart
        className={liked ? "h-4 w-4 fill-current text-text-primary" : "h-4 w-4"}
        aria-hidden="true"
      />
      {liked ? t("media.liked") : t("media.like")}
      {count !== null ? <span>{count}</span> : null}
    </Button>
  );
}
