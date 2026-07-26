"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createMediaDeliveryTarget, type MediaDeliveryTarget, type MediaDeliveryVariant } from "@/lib/media/delivery";

type ViewerVariant = Extract<MediaDeliveryVariant, "thumbnail" | "medium" | "display" | "poster">;

type CachedGrant = {
  url: string;
  expiresAt: number;
  variant: ViewerVariant;
  allowProxyFallback: boolean;
};

const grants = new Map<string, CachedGrant>();
const refreshLeewayMs = 30_000;

function keyFor(mediaId: string, variant: ViewerVariant) {
  return `${mediaId}:${variant}`;
}

function preferredVariant(scale: number, isVideo: boolean): ViewerVariant {
  if (isVideo) return "display";
  return scale > 2 ? "display" : scale > 1.25 ? "display" : "medium";
}

async function requestGrant(mediaId: string, variant: ViewerVariant) {
  const key = keyFor(mediaId, variant);
  const cached = grants.get(key);
  if (cached && cached.expiresAt - Date.now() > refreshLeewayMs) return cached;

  const response = await fetch(`/api/media/${encodeURIComponent(mediaId)}/delivery-grant`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ variant }),
  });
  if (!response.ok) throw new Error(`Delivery grant failed: ${response.status}`);
  const payload = await response.json() as { url?: unknown; expiresAt?: unknown; allowProxyFallback?: unknown };
  if (typeof payload.url !== "string" || typeof payload.expiresAt !== "string") {
    throw new Error("Delivery grant returned an invalid response.");
  }
  const expiresAt = Date.parse(payload.expiresAt);
  if (!Number.isFinite(expiresAt)) throw new Error("Delivery grant expiry is invalid.");
  const grant = { url: payload.url, expiresAt, variant, allowProxyFallback: payload.allowProxyFallback !== false };
  grants.set(key, grant);
  return grant;
}

export function useViewerDelivery({
  mediaId,
  privateAlbum,
  fallback,
  scale,
  isVideo,
}: {
  mediaId: string | null | undefined;
  privateAlbum: boolean;
  fallback: MediaDeliveryTarget;
  scale: number;
  isVideo: boolean;
}) {
  const [target, setTarget] = useState<MediaDeliveryTarget>(fallback);
  const requestId = useRef(0);
  const fallbackSignature = fallback.candidates.map((candidate) => candidate.src).join("\n");
  const fallbackRef = useRef(fallback);
  const variant = preferredVariant(scale, isVideo);

  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback, fallbackSignature]);

  useEffect(() => {
    setTarget(fallbackRef.current);
    if (!privateAlbum || !mediaId) return;
    const currentRequest = ++requestId.current;
    void requestGrant(mediaId, variant)
      .then((grant) => {
        if (requestId.current !== currentRequest) return;
        const signed = createMediaDeliveryTarget(grant.url, grant.variant, isVideo ? "video" : "image");
        setTarget({
          src: signed.src,
          candidates: grant.allowProxyFallback
            ? [...signed.candidates, ...fallbackRef.current.candidates]
            : signed.candidates,
        });
      })
      .catch(() => {
        if (requestId.current === currentRequest) setTarget(fallbackRef.current);
      });
  }, [fallbackSignature, isVideo, mediaId, privateAlbum, variant]);

  const prefetch = useCallback((nextMediaId: string, nextIsVideo = false) => {
    if (!privateAlbum) return;
    const nextVariant = preferredVariant(1, nextIsVideo);
    void requestGrant(nextMediaId, nextVariant)
      .then((grant) => {
        if (typeof Image === "undefined" || nextIsVideo) return;
        const image = new Image();
        image.src = grant.url;
      })
      .catch(() => undefined);
  }, [privateAlbum]);

  return { target, prefetch, variant };
}
