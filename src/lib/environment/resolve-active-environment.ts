import { type EnvironmentPreferences, type EnvironmentPresetId } from "./preferences";
import { type EnvironmentPhase, resolveAutoEnvironmentPhase } from "./phase";
import { type EnvironmentState, getEnvironmentState, ENVIRONMENT_STATE_REGISTRY } from "./presets";

export type ActiveEnvironment = {
  preset: EnvironmentPresetId;
  phase: EnvironmentPhase;
  state: EnvironmentState;
};

export function resolveActiveEnvironment(
  preferences: EnvironmentPreferences,
  artistPresetFallback?: string
): ActiveEnvironment {
  let fallback = "sakura";
  
  if (artistPresetFallback) {
    fallback = artistPresetFallback;
  } else if (typeof document !== "undefined" && document.documentElement.dataset.environmentArtistPreset) {
    fallback = document.documentElement.dataset.environmentArtistPreset;
  }

  let resolvedPreset = preferences.preset === "default" ? fallback : preferences.preset;
  
  const validPresets = ["sakura", "fireflies", "snow", "autumn", "mist", "rain"];
  if (!validPresets.includes(resolvedPreset)) {
    resolvedPreset = "sakura";
  }

  const resolvedPhase = preferences.phase === "auto" ? resolveAutoEnvironmentPhase(new Date()) : preferences.phase;
  const state = getEnvironmentState(resolvedPreset as EnvironmentPresetId, resolvedPhase);

  // Fallback to a known state if the registry lookup fails (should not happen if registry is complete)
  const safeState = state || Object.values(ENVIRONMENT_STATE_REGISTRY)[0];

  return {
    preset: resolvedPreset as EnvironmentPresetId,
    phase: resolvedPhase,
    state: safeState
  };
}
