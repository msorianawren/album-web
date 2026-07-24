import { type EnvironmentPreferences, type EnvironmentPresetId } from "./preferences.ts";
import { type EnvironmentPhase, resolveAutoEnvironmentPhase } from "./phase.ts";
import { type EnvironmentState, getEnvironmentState, ENVIRONMENT_STATE_REGISTRY } from "./presets.ts";

export type ActiveEnvironment = {
  preset: EnvironmentPresetId;
  phase: EnvironmentPhase;
  state: EnvironmentState;
};

export function resolveActiveEnvironment(
  preferences: EnvironmentPreferences,
  artistPresetFallback: string,
  resolvedPhase: EnvironmentPhase
): ActiveEnvironment {
  const validPresets = ["sakura", "fireflies", "snow", "autumn", "mist", "rain"];
  const fallback = validPresets.includes(artistPresetFallback) ? artistPresetFallback : "sakura";

  let resolvedPreset = preferences.preset === "default" ? fallback : preferences.preset;

  if (!validPresets.includes(resolvedPreset)) {
    resolvedPreset = "sakura";
  }

  const state = getEnvironmentState(resolvedPreset as EnvironmentPresetId, resolvedPhase);

  // Fallback to a known state if the registry lookup fails (should not happen if registry is complete)
  const safeState = state || Object.values(ENVIRONMENT_STATE_REGISTRY)[0];

  return {
    preset: resolvedPreset as EnvironmentPresetId,
    phase: resolvedPhase,
    state: safeState
  };
}
