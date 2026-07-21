import type { EnvironmentQuality } from "./quality";

export interface WeatherProfile {
  id: string;
  type: "rain" | "snow" | "mist" | "particles";
  layers: {
    near: { density: number; speed: number; scale: number; opacity: number };
    mid: { density: number; speed: number; scale: number; opacity: number };
    far: { density: number; speed: number; scale: number; opacity: number };
  };
  color: string;
  wetnessMultiplier: number;
  qualityMultipliers: Record<EnvironmentQuality["tier"], number>;
}

export const rainProfile: WeatherProfile = {
  id: "rain",
  type: "rain",
  layers: {
    near: { density: 1000, speed: 22, scale: 1.5, opacity: 0.15 },
    mid: { density: 3000, speed: 16, scale: 1.0, opacity: 0.25 },
    far: { density: 5000, speed: 12, scale: 0.6, opacity: 0.1 },
  },
  color: "#a0b0c0",
  wetnessMultiplier: 1.0,
  qualityMultipliers: {
    full: 1.0,
    reduced: 0.3,
    off: 0.0,
  },
};

export const weatherProfiles: Record<string, WeatherProfile> = {
  rain: rainProfile,
};
