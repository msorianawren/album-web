import type { EnvironmentPhasePreference } from "./phase.ts";

export const ENVIRONMENT_PRESET_IDS = ["sakura", "fireflies", "snow", "autumn", "mist", "rain"] as const;
export type EnvironmentPresetId = typeof ENVIRONMENT_PRESET_IDS[number];
export type EnvironmentPresetPreference = "default" | EnvironmentPresetId;

export type EnvironmentPreferences = {
  version: 2;
  preset: EnvironmentPresetPreference;
  phase: EnvironmentPhasePreference;
  windSpeed: number;
  gustStrength: number;
  gustFrequency: number;
  turbulence: number;
  branchSway: number;
  environmentDensity: number;
  particleAmount: number;
  atmosphere: number;
  spatialDepth: number;
  brightness: number;
  birdDensity: number;
  birdSongFrequency: number;
  chimeVolume: number;
  autoChimeFrequency: number;
  precipitationAmount: number;
  wetness: number;
  dropletAmount: number;
};

export const ENVIRONMENT_PREFERENCES_KEY = "oriana_environment_preferences_v2";
export const ENVIRONMENT_PREFERENCES_EVENT = "oriana-environment-preferences-change";
export const ENVIRONMENT_PROFILE_METADATA_KEY = "environment_preferences";

export const artistEnvironmentDefaults: EnvironmentPreferences = {
  version: 2,
  preset: "default",
  phase: "auto",
  windSpeed: 34,
  gustStrength: 42,
  gustFrequency: 30,
  turbulence: 24,
  branchSway: 48,
  environmentDensity: 52,
  particleAmount: 46,
  atmosphere: 42,
  spatialDepth: 68,
  brightness: 100,
  birdDensity: 36,
  birdSongFrequency: 24,
  chimeVolume: 66,
  autoChimeFrequency: 32,
  precipitationAmount: 50,
  wetness: 60,
  dropletAmount: 45,
};

export const reducedDecorationEnvironmentPreset: EnvironmentPreferences = {
  ...artistEnvironmentDefaults,
  windSpeed: 20,
  gustStrength: 18,
  gustFrequency: 14,
  turbulence: 12,
  branchSway: 20,
  environmentDensity: 24,
  particleAmount: 20,
  atmosphere: 28,
  spatialDepth: 38,
  birdDensity: 14,
  birdSongFrequency: 8,
  autoChimeFrequency: 10,
  precipitationAmount: 25,
  wetness: 30,
  dropletAmount: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clamp(value: unknown, fallback: number, min = 0, max = 100) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function normalizePreset(value: unknown): EnvironmentPresetPreference {
  return value === "default" || ENVIRONMENT_PRESET_IDS.includes(value as EnvironmentPresetId)
    ? value as EnvironmentPresetPreference
    : "default";
}

function normalizePhase(value: unknown): EnvironmentPhasePreference {
  return value === "day" || value === "sunset" || value === "night" || value === "auto"
    ? value
    : "auto";
}

export function normalizeEnvironmentPreferences(value: unknown): EnvironmentPreferences {
  const input = isRecord(value) ? value : {};
  return {
    version: 2,
    preset: normalizePreset(input.preset),
    phase: normalizePhase(input.phase),
    windSpeed: clamp(input.windSpeed, artistEnvironmentDefaults.windSpeed),
    gustStrength: clamp(input.gustStrength, artistEnvironmentDefaults.gustStrength),
    gustFrequency: clamp(input.gustFrequency, artistEnvironmentDefaults.gustFrequency),
    turbulence: clamp(input.turbulence, artistEnvironmentDefaults.turbulence),
    branchSway: clamp(input.branchSway, artistEnvironmentDefaults.branchSway),
    environmentDensity: clamp(input.environmentDensity, artistEnvironmentDefaults.environmentDensity),
    particleAmount: clamp(input.particleAmount, artistEnvironmentDefaults.particleAmount),
    atmosphere: clamp(input.atmosphere, artistEnvironmentDefaults.atmosphere),
    spatialDepth: clamp(input.spatialDepth, artistEnvironmentDefaults.spatialDepth),
    brightness: clamp(input.brightness, artistEnvironmentDefaults.brightness, 60, 140),
    birdDensity: clamp(input.birdDensity, artistEnvironmentDefaults.birdDensity),
    birdSongFrequency: clamp(input.birdSongFrequency, artistEnvironmentDefaults.birdSongFrequency),
    chimeVolume: clamp(input.chimeVolume, artistEnvironmentDefaults.chimeVolume),
    autoChimeFrequency: clamp(input.autoChimeFrequency, artistEnvironmentDefaults.autoChimeFrequency),
    precipitationAmount: clamp(input.precipitationAmount, artistEnvironmentDefaults.precipitationAmount),
    wetness: clamp(input.wetness, artistEnvironmentDefaults.wetness),
    dropletAmount: clamp(input.dropletAmount, artistEnvironmentDefaults.dropletAmount),
  };
}

export function migrateLegacyEnvironmentPreferences(storage: Pick<Storage, "getItem">) {
  const stored = storage.getItem(ENVIRONMENT_PREFERENCES_KEY) || storage.getItem("oriana_environment_preferences_v1");
  if (stored) {
    try {
      return normalizeEnvironmentPreferences(JSON.parse(stored));
    } catch {
      return artistEnvironmentDefaults;
    }
  }
  const legacyPreset = storage.getItem("ui_bg_theme");
  const legacyPhase = storage.getItem("album-theme");
  return normalizeEnvironmentPreferences({ preset: legacyPreset, phase: legacyPhase });
}

export function readEnvironmentPreferences() {
  if (typeof window === "undefined") return artistEnvironmentDefaults;
  try {
    return migrateLegacyEnvironmentPreferences(window.localStorage);
  } catch {
    return artistEnvironmentDefaults;
  }
}

export function writeEnvironmentPreferences(value: EnvironmentPreferences) {
  const preferences = normalizeEnvironmentPreferences(value);
  window.localStorage.setItem(ENVIRONMENT_PREFERENCES_KEY, JSON.stringify(preferences));
  window.localStorage.setItem("ui_bg_theme", preferences.preset);
  window.localStorage.setItem("album-theme", preferences.phase);
  window.dispatchEvent(new CustomEvent(ENVIRONMENT_PREFERENCES_EVENT));
  window.dispatchEvent(new CustomEvent("ui_preferences_changed"));
  window.dispatchEvent(new CustomEvent("album-theme-change"));
  return preferences;
}

export function getEnvironmentPreferencesFromMetadata(metadata: unknown) {
  if (!isRecord(metadata)) return artistEnvironmentDefaults;
  return normalizeEnvironmentPreferences(metadata[ENVIRONMENT_PROFILE_METADATA_KEY]);
}

export function mergeEnvironmentPreferencesIntoMetadata(metadata: unknown, preferences: unknown) {
  const base = isRecord(metadata) ? { ...metadata } : {};
  return { ...base, [ENVIRONMENT_PROFILE_METADATA_KEY]: normalizeEnvironmentPreferences(preferences) };
}

export function hasOnlyEnvironmentPreferenceKeys(value: unknown) {
  if (!isRecord(value)) return false;
  const allowed = new Set(Object.keys(artistEnvironmentDefaults));
  return Object.keys(value).every((key) => allowed.has(key));
}
