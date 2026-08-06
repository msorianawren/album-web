"use client";

import dynamic from "next/dynamic";
import { useMemo, useSyncExternalStore } from "react";
import { useEnvironmentPreferences, useResolvedEnvironmentPhase } from "@/hooks/useEnvironmentPreferences";
import { resolveActiveEnvironment } from "@/lib/environment/resolve-active-environment";
import { subscribeArtistConfig, getArtistConfigSnapshot, getServerArtistConfigSnapshot } from "@/lib/environment/artist-store";

const AlbumCamera = dynamic(
  () => import("@/components/albums/AlbumCamera").then((m) => m.AlbumCamera),
  { ssr: false },
);

export function AlbumCameraBackground() {
  const { preferences } = useEnvironmentPreferences();
  const phase = useResolvedEnvironmentPhase(preferences.phase);
  const artistSnapshot = useSyncExternalStore(subscribeArtistConfig, getArtistConfigSnapshot, getServerArtistConfigSnapshot);

  const activeEnvironment = useMemo(() => {
    const fallback = artistSnapshot.split(":")[0];
    return resolveActiveEnvironment(preferences, fallback, phase);
  }, [preferences, phase, artistSnapshot]);

  if (preferences.performanceProfile !== "high") return null;

  return <AlbumCamera environment={activeEnvironment.state} />;
}
