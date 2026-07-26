"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createMediaDeliveryTarget, type MediaDeliveryTarget, type MediaDeliveryVariant } from "@/lib/media/delivery";
import {
  deliveryGrantRefreshDelay,
  isDeliveryGrantFresh,
} from "@/lib/media/delivery-grant-cache";

type ViewerVariant = Extract<MediaDeliveryVariant, "thumbnail" | "medium" | "display" | "poster">;

type CachedGrant = {
  url: string;
  expiresAt: number;
  variant: ViewerVariant;
  allowProxyFallback: boolean;
};

const grants = new Map<string, CachedGrant>();

function keyFor(mediaId: string, variant: ViewerVariant) {
  return `${mediaId}:${variant}`;
}

function preferredVariant(scale: number, isVideo: boolean, pixelDemand: number): ViewerVariant {
  if (isVideo) return "display";
  return scale > 1.25 || pixelDemand > 1800 ? "display" : "medium";
}

function viewportPixelDemand(scale: number) {
  if (typeof window === "undefined") return 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return Math.max(window.innerWidth, window.innerHeight) * dpr * scale;
}

async function decodeBeforeSwap(src: string) {
  if (typeof Image === "undefined") return;
  const image = new Image();
  image.src = src;
  try {
    await image.decode();
  } catch {
    await new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });
  }
}

async function requestGrant(mediaId: string, variant: ViewerVariant) {
  const key = keyFor(mediaId, variant);
  const cached = grants.get(key);
  if (cached && isDeliveryGrantFresh(cached.expiresAt)) return cached;

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
  const [pixelDemand, setPixelDemand] = useState(() => viewportPixelDemand(scale));
  const [grantRevision, setGrantRevision] = useState(0);
  const requestId = useRef(0);
  const fallbackSignature = fallback.candidates.map((candidate) => candidate.src).join("\n");
  const fallbackRef = useRef(fallback);
  const variant = preferredVariant(scale, isVideo, pixelDemand);

  useEffect(() => {
    const updateDemand = () => setPixelDemand(viewportPixelDemand(scale));
    updateDemand();
    window.addEventListener("resize", updateDemand);
    return () => window.removeEventListener("resize", updateDemand);
  }, [scale]);

  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback, fallbackSignature]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    let refreshTimer: number | undefined;
    setTarget(fallbackRef.current);
    if (!privateAlbum || !mediaId) return;
    void requestGrant(mediaId, variant)
      .then(async (grant) => {
        if (requestId.current !== currentRequest) return;
        const signed = createMediaDeliveryTarget(grant.url, grant.variant, isVideo ? "video" : "image");
        if (!isVideo && grant.variant === "display") await decodeBeforeSwap(grant.url);
        if (requestId.current !== currentRequest) return;
        setTarget({
          src: signed.src,
          candidates: grant.allowProxyFallback
            ? [...signed.candidates, ...fallbackRef.current.candidates]
            : signed.candidates,
        });
        refreshTimer = window.setTimeout(() => {
          if (requestId.current === currentRequest) setGrantRevision((revision) => revision + 1);
        }, deliveryGrantRefreshDelay(grant.expiresAt));
      })
      .catch(() => {
        if (requestId.current === currentRequest) setTarget(fallbackRef.current);
      });
    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      if (requestId.current === currentRequest) requestId.current += 1;
    };
  }, [fallbackSignature, grantRevision, isVideo, mediaId, privateAlbum, variant]);

  const prefetch = useCallback((nextMediaId: string, nextIsVideo = false) => {
    if (!privateAlbum) return;
    const nextVariant = preferredVariant(1, nextIsVideo, viewportPixelDemand(1));
    void requestGrant(nextMediaId, nextVariant)
      .then((grant) => {
        if (typeof Image === "undefined" || nextIsVideo) return;
        const image = new Image();
        image.src = grant.url;
      })
      .catch(() => undefined);
  }, [privateAlbum]);

  return { target, prefetch, variant, pixelDemand };
}
