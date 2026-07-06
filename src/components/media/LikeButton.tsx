"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface LikeButtonProps {
  albumId: string;
}

export function LikeButton({ albumId }: LikeButtonProps) {
  const [count, setCount] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);

  function getClientId() {
    const key = "album_client_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;

    const created = crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  }

  async function likeAlbum() {
    if (liked) return;
    setLiked(true);
    const clientId = getClientId();

    const response = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId, clientId }),
    });
    const payload = await response.json();
    if (payload.success) setCount(payload.data.count);
  }

  return (
    <Button variant="secondary" onClick={likeAlbum} disabled={liked}>
      <Heart className="h-4 w-4" aria-hidden="true" />
      {liked ? "Liked" : "Like"}
      {count !== null ? <span>{count}</span> : null}
    </Button>
  );
}
