import type { EnvironmentQuality } from "./quality";

export type Vector3Tuple = [number, number, number];

export interface BranchingRules {
  spread: number;
  taper: number;
  droop: number;
  stiffness: number;
  segments: number;
}

export interface FoliageRules {
  aspectRatio: number;
  density: number;
  colors: string[];
  scaleRange: [number, number];
  flutter: number;
  windDrag: number;
}

export interface BotanicalArchetype {
  id: string;
  seed: number;
  branching: BranchingRules;
  foliage: FoliageRules;
  placements: {
    hero: Vector3Tuple;
    midground: Vector3Tuple[];
    far: Vector3Tuple[];
  };
  qualityMultipliers: Record<EnvironmentQuality["tier"], number>;
  canopyShadow: {
    opacity: number;
    scale: number;
    speed: number;
  };
}

export const willowProfile: BotanicalArchetype = {
  id: "willow",
  seed: 42,
  branching: {
    spread: 1.2,
    taper: 0.7,
    droop: 1.8,
    stiffness: 0.4,
    segments: 6,
  },
  foliage: {
    aspectRatio: 0.15, // long, narrow leaves
    density: 120,
    colors: ["#2d4a22", "#3a5f2b", "#4a7a37", "#1f3317"],
    scaleRange: [0.6, 1.2],
    flutter: 1.5,
    windDrag: 0.8,
  },
  placements: {
    hero: [6.5, 9, -2],
    midground: [
      [-5, 7, 1],
      [4, 6, -5],
    ],
    far: [
      [-8, 8, -8],
      [8, 9, -12],
    ],
  },
  qualityMultipliers: {
    full: 1.0,
    reduced: 0.4,
    off: 0.0,
  },
  canopyShadow: {
    opacity: 0.4,
    scale: 1.5,
    speed: 0.8,
  },
};

export const botanicalProfiles: Record<string, BotanicalArchetype> = {
  willow: willowProfile,
};
