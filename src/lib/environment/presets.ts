import type { EnvironmentPhase } from "./phase.ts";
import { ENVIRONMENT_PRESET_IDS, type EnvironmentPresetId } from "./preferences.ts";

export type EnvironmentState = {
  preset: EnvironmentPresetId;
  phase: EnvironmentPhase;
  clearColor: string;
  keyLight: string;
  fillLight: string;
  keyIntensity: number;
  ambientIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  branchColor: string;
  foliage: readonly [string, string, string];
  particle: readonly [string, string];
  chimeReflection: number;
  birdActivity: number;
  birdSong: number;
  wind: number;
  fireflies: number;
};

const state = (preset: EnvironmentPresetId, phase: EnvironmentPhase, values: Omit<EnvironmentState, "preset" | "phase">): EnvironmentState => ({ preset, phase, ...values });

const registryEntries: EnvironmentState[] = [
  state("sakura", "day", { clearColor: "#f5eee9", keyLight: "#fff1d8", fillLight: "#c9ddeb", keyIntensity: 1.35, ambientIntensity: 0.78, fogColor: "#efe5e4", fogNear: 8, fogFar: 22, branchColor: "#625048", foliage: ["#f8d9df", "#efb7c5", "#e8c9c0"], particle: ["#f7cbd5", "#fff1ee"], chimeReflection: 1, birdActivity: 1, birdSong: .9, wind: .9, fireflies: .05 }),
  state("sakura", "sunset", { clearColor: "#ead3c8", keyLight: "#ffb986", fillLight: "#c9a8c7", keyIntensity: 1.55, ambientIntensity: .62, fogColor: "#dcbeb9", fogNear: 7, fogFar: 20, branchColor: "#5a403b", foliage: ["#f1b8c1", "#ffcfbd", "#d98fa5"], particle: ["#ffc3bd", "#ffe0ce"], chimeReflection: 1.25, birdActivity: .72, birdSong: .55, wind: 1, fireflies: .14 }),
  state("sakura", "night", { clearColor: "#182331", keyLight: "#a8c9ef", fillLight: "#53647e", keyIntensity: .9, ambientIntensity: .36, fogColor: "#263548", fogNear: 6, fogFar: 18, branchColor: "#2b2830", foliage: ["#b7a8bd", "#d4c2ce", "#7f7288"], particle: ["#dac7d5", "#8eaee0"], chimeReflection: .7, birdActivity: .12, birdSong: .04, wind: .65, fireflies: .28 }),
  state("fireflies", "day", { clearColor: "#dce5d4", keyLight: "#e9f1c9", fillLight: "#9eb9a1", keyIntensity: 1.15, ambientIntensity: .72, fogColor: "#cbd9c5", fogNear: 7, fogFar: 21, branchColor: "#4b5947", foliage: ["#78916a", "#a8b985", "#4f6e55"], particle: ["#d7d8ab", "#edf1ce"], chimeReflection: .75, birdActivity: .8, birdSong: .72, wind: .75, fireflies: .04 }),
  state("fireflies", "sunset", { clearColor: "#687b59", keyLight: "#f0c878", fillLight: "#658478", keyIntensity: 1.3, ambientIntensity: .48, fogColor: "#6f7d64", fogNear: 6, fogFar: 18, branchColor: "#3f4736", foliage: ["#9b9b54", "#6e8755", "#c0a55f"], particle: ["#ffe18b", "#cdd978"], chimeReflection: .9, birdActivity: .62, birdSong: .46, wind: .7, fireflies: .48 }),
  state("fireflies", "night", { clearColor: "#0d2426", keyLight: "#6ea89a", fillLight: "#243f43", keyIntensity: .62, ambientIntensity: .28, fogColor: "#163337", fogNear: 5, fogFar: 16, branchColor: "#1f302a", foliage: ["#31594a", "#436c55", "#223f38"], particle: ["#e8d77a", "#a8cf83"], chimeReflection: .48, birdActivity: .08, birdSong: .02, wind: .55, fireflies: 1 }),
  state("snow", "day", { clearColor: "#e8edf0", keyLight: "#f7fbff", fillLight: "#b7c9d8", keyIntensity: 1.15, ambientIntensity: .82, fogColor: "#dbe4e9", fogNear: 7, fogFar: 19, branchColor: "#6d6867", foliage: ["#d8e2e6", "#b9c9ce", "#eef3f5"], particle: ["#ffffff", "#c9dce9"], chimeReflection: 1.1, birdActivity: .36, birdSong: .22, wind: .82, fireflies: 0 }),
  state("snow", "sunset", { clearColor: "#d9cbd8", keyLight: "#ffc6bc", fillLight: "#aeb7db", keyIntensity: 1.2, ambientIntensity: .64, fogColor: "#cfccd9", fogNear: 6, fogFar: 18, branchColor: "#66595f", foliage: ["#e8d9df", "#c8c5db", "#f3e8e8"], particle: ["#fff5f2", "#d7d9ef"], chimeReflection: 1.18, birdActivity: .22, birdSong: .12, wind: .72, fireflies: 0 }),
  state("snow", "night", { clearColor: "#14243a", keyLight: "#9ebce8", fillLight: "#354967", keyIntensity: .72, ambientIntensity: .34, fogColor: "#243750", fogNear: 5, fogFar: 16, branchColor: "#303743", foliage: ["#b7c5d9", "#768ba9", "#d6deeb"], particle: ["#e9f1ff", "#9ab5dc"], chimeReflection: .72, birdActivity: .03, birdSong: 0, wind: .5, fireflies: 0 }),
  state("autumn", "day", { clearColor: "#e7d9c3", keyLight: "#f5d6a0", fillLight: "#b59b7d", keyIntensity: 1.3, ambientIntensity: .72, fogColor: "#d8c6aa", fogNear: 7, fogFar: 21, branchColor: "#5b4435", foliage: ["#b76d36", "#d7a44e", "#8f4e35"], particle: ["#c87b3e", "#e2b45d"], chimeReflection: .92, birdActivity: .72, birdSong: .55, wind: 1.05, fireflies: 0 }),
  state("autumn", "sunset", { clearColor: "#b96f4b", keyLight: "#ff9b55", fillLight: "#8d5b5c", keyIntensity: 1.65, ambientIntensity: .55, fogColor: "#a96e58", fogNear: 6, fogFar: 18, branchColor: "#4d322b", foliage: ["#d87839", "#efad4d", "#8c3f2c"], particle: ["#f19a45", "#c96733"], chimeReflection: 1.3, birdActivity: .84, birdSong: .35, wind: 1.2, fireflies: .04 }),
  state("autumn", "night", { clearColor: "#211b24", keyLight: "#9daed1", fillLight: "#5a4545", keyIntensity: .7, ambientIntensity: .3, fogColor: "#322831", fogNear: 6, fogFar: 17, branchColor: "#2f2527", foliage: ["#6e4837", "#8a5940", "#4b3432"], particle: ["#9d6845", "#6e493d"], chimeReflection: .62, birdActivity: .08, birdSong: .01, wind: .68, fireflies: 0 }),
  state("mist", "day", { clearColor: "#dce2df", keyLight: "#e9f0df", fillLight: "#aabbbb", keyIntensity: .92, ambientIntensity: .82, fogColor: "#cbd5d2", fogNear: 4, fogFar: 15, branchColor: "#56635c", foliage: ["#819287", "#9faea2", "#66796f"], particle: ["#dfe7e3", "#b9cac4"], chimeReflection: .66, birdActivity: .5, birdSong: .34, wind: .62, fireflies: 0 }),
  state("mist", "sunset", { clearColor: "#c8b8a8", keyLight: "#efbd80", fillLight: "#9ea8ad", keyIntensity: 1.16, ambientIntensity: .64, fogColor: "#bfb4aa", fogNear: 3.5, fogFar: 14, branchColor: "#514f49", foliage: ["#858878", "#a39b7f", "#646d65"], particle: ["#d9c7ae", "#adb8b6"], chimeReflection: .78, birdActivity: .42, birdSong: .22, wind: .6, fireflies: .05 }),
  state("mist", "night", { clearColor: "#17242d", keyLight: "#8daec6", fillLight: "#354b58", keyIntensity: .56, ambientIntensity: .32, fogColor: "#2c3c44", fogNear: 3, fogFar: 12, branchColor: "#29353a", foliage: ["#45585c", "#5d6d6d", "#34464d"], particle: ["#829aa4", "#536d78"], chimeReflection: .42, birdActivity: .06, birdSong: 0, wind: .48, fireflies: .08 }),
  state("rain", "day", { clearColor: "#cfd9da", keyLight: "#dce7e2", fillLight: "#8da8ae", keyIntensity: .85, ambientIntensity: .76, fogColor: "#bfcdd0", fogNear: 6, fogFar: 18, branchColor: "#4b5d56", foliage: ["#557867", "#74927b", "#3f6556"], particle: ["#a9c3cc", "#d5e2e4"], chimeReflection: .92, birdActivity: .2, birdSong: .1, wind: 1.05, fireflies: 0 }),
  state("rain", "sunset", { clearColor: "#8d8179", keyLight: "#dca16f", fillLight: "#617b84", keyIntensity: 1.04, ambientIntensity: .58, fogColor: "#817f7b", fogNear: 5, fogFar: 16, branchColor: "#3f4d47", foliage: ["#526a59", "#7e7655", "#3e5a4d"], particle: ["#d1aa82", "#93abb3"], chimeReflection: 1.05, birdActivity: .12, birdSong: .04, wind: 1.08, fireflies: .02 }),
  state("rain", "night", { clearColor: "#111f2b", keyLight: "#7899bc", fillLight: "#2b4656", keyIntensity: .55, ambientIntensity: .3, fogColor: "#253744", fogNear: 4, fogFar: 14, branchColor: "#243832", foliage: ["#314d42", "#3e5a4e", "#223b35"], particle: ["#718fa5", "#b4cad8"], chimeReflection: .54, birdActivity: .02, birdSong: 0, wind: .82, fireflies: 0 }),
];

export const ENVIRONMENT_STATE_REGISTRY = Object.fromEntries(
  registryEntries.map((entry) => [`${entry.preset}:${entry.phase}`, entry]),
) as Record<`${EnvironmentPresetId}:${EnvironmentPhase}`, EnvironmentState>;

export function getEnvironmentState(preset: EnvironmentPresetId, phase: EnvironmentPhase) {
  return ENVIRONMENT_STATE_REGISTRY[`${preset}:${phase}`];
}

export function hasCompleteEnvironmentRegistry() {
  return ENVIRONMENT_PRESET_IDS.every((preset) => ["day", "sunset", "night"].every((phase) => Boolean(ENVIRONMENT_STATE_REGISTRY[`${preset}:${phase as EnvironmentPhase}`])));
}
