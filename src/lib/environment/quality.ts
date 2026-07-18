import type { DepthEffectsMode } from "@/hooks/useDepthEffects";

export type EnvironmentQuality = {
  enabled: boolean;
  tier: "full" | "reduced" | "off";
  dpr: [number, number];
  particleCap: number;
  birdCap: number;
  chimeCap: number;
  shadows: boolean;
};

export function resolveEnvironmentQuality(
  mode: DepthEffectsMode,
  viewportWidth: number,
  saveData = false,
): EnvironmentQuality {
  if (mode === "off") return { enabled: false, tier: "off", dpr: [1, 1], particleCap: 0, birdCap: 0, chimeCap: 0, shadows: false };
  const mobile = viewportWidth < 768;
  const reduced = mode === "reduced" || saveData || (mode === "auto" && viewportWidth < 1100);
  if (mobile) return { enabled: true, tier: "reduced", dpr: [1, 1.15], particleCap: 36, birdCap: 3, chimeCap: 4, shadows: false };
  if (reduced) return { enabled: true, tier: "reduced", dpr: [1, 1.2], particleCap: 58, birdCap: 5, chimeCap: 4, shadows: false };
  return { enabled: true, tier: "full", dpr: [1, 1.5], particleCap: 128, birdCap: 10, chimeCap: 4, shadows: true };
}
