"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "oriana.albumSeen.v1";
const MAX_RECORDS = 150;

export interface AlbumViewRecord {
  albumId: string;
  slug: string;
  firstSeenAt: number;
  lastSeenAt: number;
  viewCount: number;
  lastMediaId?: string;
  lastMediaIndex?: number;
}

export interface AlbumViewState {
  isNew: boolean;
  isRecentlyViewed: boolean;
  isViewed: boolean;
  canContinue: boolean;
  record: AlbumViewRecord | null;
}

function getRawMemory(): Record<string, AlbumViewRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function saveRawMemory(memory: Record<string, AlbumViewRecord>) {
  if (typeof window === "undefined") return;
  try {
    const values = Object.values(memory);
    if (values.length > MAX_RECORDS) {
      // Sort by lastSeenAt descending and take top MAX_RECORDS
      values.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
      const pruned: Record<string, AlbumViewRecord> = {};
      for (const item of values.slice(0, MAX_RECORDS)) {
        pruned[item.albumId] = item;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    }
    window.dispatchEvent(new Event("albumMemoryUpdated"));
  } catch {
    // Ignore storage quota or parse errors silently
  }
}

export function pruneAlbumViewMemory(retentionDays = 180) {
  const memory = getRawMemory();
  const now = Date.now();
  const thresholdMs = retentionDays * 24 * 60 * 60 * 1000;
  let changed = false;

  for (const [albumId, record] of Object.entries(memory)) {
    if (now - record.lastSeenAt > thresholdMs) {
      delete memory[albumId];
      changed = true;
    }
  }

  if (changed) {
    saveRawMemory(memory);
  }
}

export function useAlbumViewMemory(settings?: { retentionDays?: number, recentThresholdHours?: number }) {
  const [memory, setMemory] = useState<Record<string, AlbumViewRecord>>({});
  const [isClient, setIsClient] = useState(false);

  const recentThresholdHours = settings?.recentThresholdHours || 48;

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      setIsClient(true);
      setMemory(getRawMemory());
      if (settings?.retentionDays) {
        pruneAlbumViewMemory(settings.retentionDays);
      }
    }, 0);
    
    const handleUpdate = () => setMemory(getRawMemory());
    window.addEventListener("albumMemoryUpdated", handleUpdate);
    return () => {
      window.clearTimeout(initTimer);
      window.removeEventListener("albumMemoryUpdated", handleUpdate);
    };
  }, [settings?.retentionDays]);

  const markAlbumViewed = useCallback((params: { albumId: string, slug: string, mediaId?: string, mediaIndex?: number }) => {
    if (typeof window === "undefined") return;
    
    const mem = getRawMemory();
    const existing = mem[params.albumId];
    const now = Date.now();

    const record: AlbumViewRecord = {
      albumId: params.albumId,
      slug: params.slug,
      firstSeenAt: existing ? existing.firstSeenAt : now,
      lastSeenAt: now,
      viewCount: existing ? (existing.viewCount || 0) + 1 : 1,
      lastMediaId: params.mediaId ?? existing?.lastMediaId,
      lastMediaIndex: params.mediaIndex ?? existing?.lastMediaIndex,
    };

    mem[params.albumId] = record;
    saveRawMemory(mem);
    setMemory(mem);
  }, []);

  const getAlbumViewState = useCallback((albumIdOrSlug: string): AlbumViewState => {
    if (!isClient) {
      return { isNew: false, isRecentlyViewed: false, isViewed: false, canContinue: false, record: null };
    }

    const record = Object.values(memory).find(
      (r) => r.albumId === albumIdOrSlug || r.slug === albumIdOrSlug
    ) || null;

    if (!record) {
      return { isNew: true, isRecentlyViewed: false, isViewed: false, canContinue: false, record: null };
    }

    const hoursSinceLastView = (Date.now() - record.lastSeenAt) / (1000 * 60 * 60);
    const isRecentlyViewed = hoursSinceLastView <= recentThresholdHours;
    
    return {
      isNew: false,
      isRecentlyViewed,
      isViewed: !isRecentlyViewed,
      canContinue: record.lastMediaIndex !== undefined && record.lastMediaIndex >= 0,
      record,
    };
  }, [memory, isClient, recentThresholdHours]);

  const clearMemory = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    setMemory({});
    window.dispatchEvent(new Event("albumMemoryUpdated"));
  }, []);

  return {
    memory,
    isClient,
    markAlbumViewed,
    getAlbumViewState,
    clearMemory
  };
}
