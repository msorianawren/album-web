import type { EnvironmentPhase } from "./phase.ts";
import type { EnvironmentPresetId } from "./preferences.ts";

export type BirdState = "flying" | "flocking" | "approaching" | "perched" | "taking_off" | "leaving_scene";

const presetActivity: Record<EnvironmentPresetId, number> = {
  sakura: 1,
  fireflies: .76,
  snow: .32,
  autumn: .88,
  mist: .48,
  rain: .18,
};

export function birdActivityMultiplier(preset: EnvironmentPresetId, phase: EnvironmentPhase) {
  const phaseMultiplier = phase === "day" ? 1 : phase === "sunset" ? .68 : .08;
  return presetActivity[preset] * phaseMultiplier;
}

export function birdSongMultiplier(preset: EnvironmentPresetId, phase: EnvironmentPhase) {
  if (phase === "night") return preset === "sakura" ? .05 : 0;
  const weather = preset === "rain" ? .15 : preset === "snow" ? .32 : 1;
  return weather * (phase === "sunset" ? .56 : 1);
}

export function resolveBirdState(progress: number): BirdState {
  const normalized = ((progress % 1) + 1) % 1;
  if (normalized < .42) return "flying";
  if (normalized < .56) return "flocking";
  if (normalized < .68) return "approaching";
  if (normalized < .83) return "perched";
  if (normalized < .9) return "taking_off";
  return "leaving_scene";
}
