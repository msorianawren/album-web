export type GameQualityTier = "low" | "balanced" | "high";

export interface GameQualityBudget {
  maximumDevicePixelRatio: number;
  maximumParticles: number;
  targetFps: 30 | 60;
}

export function resolveGameQuality({
  width,
  reducedMotion,
  saveData,
}: {
  width: number;
  reducedMotion: boolean;
  saveData: boolean;
}): { tier: GameQualityTier; budget: GameQualityBudget } {
  if (reducedMotion || saveData || width < 640) {
    return { tier: "low", budget: { maximumDevicePixelRatio: 1, maximumParticles: 0, targetFps: 30 } };
  }
  if (width < 1280) {
    return { tier: "balanced", budget: { maximumDevicePixelRatio: 1.5, maximumParticles: 40, targetFps: 60 } };
  }
  return { tier: "high", budget: { maximumDevicePixelRatio: 2, maximumParticles: 80, targetFps: 60 } };
}
