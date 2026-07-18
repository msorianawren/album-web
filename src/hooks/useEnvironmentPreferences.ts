"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  artistEnvironmentDefaults,
  ENVIRONMENT_PREFERENCES_EVENT,
  ENVIRONMENT_PREFERENCES_KEY,
  type EnvironmentPreferences,
  normalizeEnvironmentPreferences,
  readEnvironmentPreferences,
  reducedDecorationEnvironmentPreset,
  writeEnvironmentPreferences,
} from "@/lib/environment/preferences";
import {
  applyEnvironmentPhase,
  millisecondsUntilNextPhaseBoundary,
  resolveEnvironmentPhase,
} from "@/lib/environment/phase";

type SyncState = "local" | "saving" | "saved" | "error";

export function useEnvironmentPreferences({
  userId,
  initialPreferences,
}: {
  userId?: string | null;
  initialPreferences?: unknown;
} = {}) {
  const [preferences, setPreferencesState] = useState<EnvironmentPreferences>(artistEnvironmentDefaults);
  const preferencesRef = useRef<EnvironmentPreferences>(artistEnvironmentDefaults);
  const [hydrated, setHydrated] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(userId ? "saved" : "local");
  const skipNextSync = useRef(true);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const hasLocal = window.localStorage.getItem(ENVIRONMENT_PREFERENCES_KEY) !== null;
      const initial = initialPreferences !== undefined
        ? normalizeEnvironmentPreferences(initialPreferences)
        : hasLocal
          ? readEnvironmentPreferences()
          : normalizeEnvironmentPreferences(readEnvironmentPreferences());
      if (hasLocal || initialPreferences !== undefined || window.localStorage.getItem("ui_bg_theme") || window.localStorage.getItem("album-theme")) {
        writeEnvironmentPreferences(initial);
      }
      preferencesRef.current = initial;
      setPreferencesState(initial);
      setHydrated(true);
      skipNextSync.current = true;
      if (userId && initialPreferences === undefined && !hasLocal) {
        void fetch("/api/profile/environment-preferences", { headers: { Accept: "application/json" } })
          .then((response) => response.ok ? response.json() : null)
          .then((payload) => {
            if (!active || !payload?.success) return;
            const remote = normalizeEnvironmentPreferences(payload.data?.preferences);
            preferencesRef.current = remote;
            skipNextSync.current = true;
            writeEnvironmentPreferences(remote);
            setPreferencesState(remote);
            setSyncState("saved");
          })
          .catch(() => {
            if (active) setSyncState("error");
          });
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [initialPreferences, userId]);

  useEffect(() => {
    const synchronize = () => {
      const next = readEnvironmentPreferences();
      preferencesRef.current = next;
      setPreferencesState(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === ENVIRONMENT_PREFERENCES_KEY || event.key === "ui_bg_theme" || event.key === "album-theme") synchronize();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(ENVIRONMENT_PREFERENCES_EVENT, synchronize);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ENVIRONMENT_PREFERENCES_EVENT, synchronize);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !userId) return;
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    setSyncState("saving");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/profile/environment-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
        signal: controller.signal,
      }).catch(() => null);
      if (controller.signal.aborted) return;
      setSyncState(response?.ok ? "saved" : "error");
    }, 700);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [hydrated, preferences, userId]);

  const setPreferences = useCallback((next: EnvironmentPreferences | ((current: EnvironmentPreferences) => EnvironmentPreferences)) => {
    const normalized = normalizeEnvironmentPreferences(typeof next === "function" ? next(preferencesRef.current) : next);
    preferencesRef.current = normalized;
    setPreferencesState(normalized);
    try {
      writeEnvironmentPreferences(normalized);
    } catch {
      // The in-memory preference remains usable when browser storage is unavailable.
    }
  }, []);

  const updatePreference = useCallback(<Key extends keyof EnvironmentPreferences>(key: Key, value: EnvironmentPreferences[Key]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, [setPreferences]);

  return {
    preferences,
    hydrated,
    syncState,
    resolvedPhase: resolveEnvironmentPhase(preferences.phase),
    setPreferences,
    updatePreference,
    reset: () => setPreferences(artistEnvironmentDefaults),
    reduceDecoration: () => setPreferences(reducedDecorationEnvironmentPreset),
  };
}

export function useResolvedEnvironmentPhase(preference: EnvironmentPreferences["phase"]) {
  const [phase, setPhase] = useState(() => resolveEnvironmentPhase(preference));

  useEffect(() => {
    let timer = 0;
    let lastNow = Date.now();
    const synchronize = () => {
      const now = Date.now();
      lastNow = now;
      const resolved = resolveEnvironmentPhase(preference, new Date(now));
      setPhase(resolved);
      applyEnvironmentPhase(document.documentElement, resolved);
      window.clearTimeout(timer);
      if (preference === "auto") timer = window.setTimeout(synchronize, millisecondsUntilNextPhaseBoundary(new Date(now)));
    };
    const onVisible = () => {
      if (!document.hidden || Math.abs(Date.now() - lastNow) > 60_000) synchronize();
    };
    synchronize();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [preference]);

  return phase;
}
