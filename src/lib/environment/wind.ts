import type { EnvironmentPreferences } from "./preferences.ts";

export type WindSample = {
  x: number;
  y: number;
  strength: number;
  gust: number;
  turbulence: number;
};

export type WindRuntime = {
  current: WindSample;
  impulseX: number;
  impulseY: number;
};

export function createWindRuntime(): WindRuntime {
  return { current: { x: .35, y: -.04, strength: 0, gust: 0, turbulence: 0 }, impulseX: 0, impulseY: 0 };
}

export function sampleWindField(
  elapsed: number,
  preferences: EnvironmentPreferences,
  environmentMultiplier = 1,
  runtime?: WindRuntime,
): WindSample {
  const speed = preferences.windSpeed / 100 * environmentMultiplier;
  const gustRate = .025 + preferences.gustFrequency / 100 * .16;
  const envelope = Math.pow(Math.max(0, Math.sin(elapsed * gustRate * Math.PI * 2)), 5);
  const gust = envelope * preferences.gustStrength / 100;
  const turbulence = preferences.turbulence / 100;
  const noiseX = Math.sin(elapsed * .73 + 1.9) * turbulence * .22;
  const noiseY = Math.sin(elapsed * 1.13 + .4) * turbulence * .09;
  const impulseX = runtime?.impulseX ?? 0;
  const impulseY = runtime?.impulseY ?? 0;
  return {
    x: .34 + noiseX + impulseX,
    y: -.035 + noiseY + impulseY,
    strength: Math.min(1.5, speed * (.45 + gust * .9) + Math.hypot(impulseX, impulseY)),
    gust,
    turbulence,
  };
}

export function advanceWindRuntime(
  runtime: WindRuntime,
  elapsed: number,
  delta: number,
  preferences: EnvironmentPreferences,
  environmentMultiplier = 1,
) {
  runtime.impulseX *= Math.exp(-3.2 * delta);
  runtime.impulseY *= Math.exp(-3.2 * delta);
  runtime.current = sampleWindField(elapsed, preferences, environmentMultiplier, runtime);
  return runtime.current;
}

export function applyWindInteractionImpulse(runtime: WindRuntime, x: number, y: number) {
  runtime.impulseX = Math.max(-.7, Math.min(.7, runtime.impulseX + x));
  runtime.impulseY = Math.max(-.35, Math.min(.35, runtime.impulseY + y));
}

export function automaticChimeRate(windSpeed: number, automaticFrequency: number) {
  if (windSpeed <= 0 || automaticFrequency <= 0) return 0;
  return Math.min(1, windSpeed / 100 * automaticFrequency / 100);
}
