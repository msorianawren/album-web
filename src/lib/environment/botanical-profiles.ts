import type { EnvironmentQuality } from "./quality";

export type Vector3Tuple = [number, number, number];
export type LeafGeometryType = "willow" | "maple" | "ginkgo" | "broadleaf" | "needle" | "fern";

export interface BranchingRules {
  spread: number;
  taper: number;
  droop: number;
  upwardBias: number;
  stiffness: number;
  segments: number;
  trunkColor: string;
  roughness: number;
  // Cedar-specific optional fields
  trunkHeight?: number;      // relative trunk height multiplier
  branchOriginHeight?: number; // fraction of trunk where branches begin
  trunkRadius?: number;      // base trunk thickness
}

export interface FoliageRules {
  leafType: LeafGeometryType;
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

// ─── WILLOW (Rain Garden) — FROZEN, do not change ───────────────────────────
export const willowProfile: BotanicalArchetype = {
  id: "willow",
  seed: 42,
  branching: {
    spread: 1.2,
    taper: 0.7,
    droop: 1.8,
    upwardBias: -0.4,
    stiffness: 0.4,
    segments: 6,
    trunkColor: "#4a3c31",
    roughness: 0.85,
  },
  foliage: {
    leafType: "willow",
    aspectRatio: 0.15,
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
  qualityMultipliers: { full: 1.0, reduced: 0.4, off: 0.0 },
  canopyShadow: { opacity: 0.4, scale: 1.5, speed: 0.8 },
};

// ─── MAPLE (Autumn hero) — FROZEN, do not change ─────────────────────────────
export const mapleProfile: BotanicalArchetype = {
  id: "maple",
  seed: 137,
  branching: {
    spread: 1.4,
    taper: 0.6,
    droop: 0.4,
    upwardBias: 0.8,
    stiffness: 0.7,
    segments: 7,
    trunkColor: "#5b4435",
    roughness: 0.88,
  },
  foliage: {
    leafType: "maple",
    aspectRatio: 1.0,
    density: 160,
    colors: ["#b76d36", "#d7a44e", "#8f4e35", "#c45b2a", "#e8b84b"],
    scaleRange: [0.5, 1.0],
    flutter: 1.2,
    windDrag: 0.65,
  },
  placements: {
    hero: [-7, 10, -1],
    midground: [
      [5, 7, -3],
      [-3, 6, -6],
    ],
    far: [
      [9, 8, -10],
      [-10, 9, -14],
    ],
  },
  qualityMultipliers: { full: 1.0, reduced: 0.35, off: 0.0 },
  canopyShadow: { opacity: 0.5, scale: 1.3, speed: 0.6 },
};

// ─── GINKGO (Autumn secondary) — FROZEN, do not change ───────────────────────
export const ginkgoProfile: BotanicalArchetype = {
  id: "ginkgo",
  seed: 251,
  branching: {
    spread: 0.9,
    taper: 0.75,
    droop: 0.2,
    upwardBias: 1.0,
    stiffness: 0.8,
    segments: 5,
    trunkColor: "#6b5848",
    roughness: 0.82,
  },
  foliage: {
    leafType: "ginkgo",
    aspectRatio: 1.2,
    density: 90,
    colors: ["#d4a835", "#e8c454", "#b8951e", "#f0d06a"],
    scaleRange: [0.4, 0.9],
    flutter: 0.9,
    windDrag: 0.55,
  },
  placements: {
    hero: [3, 7, -3],
    midground: [[-6, 6, -4]],
    far: [[7, 6, -11]],
  },
  qualityMultipliers: { full: 1.0, reduced: 0.3, off: 0.0 },
  canopyShadow: { opacity: 0.35, scale: 1.1, speed: 0.7 },
};

// ─── CEDAR (Misty Cedar Forest) ───────────────────────────────────────────────
export const cedarProfile: BotanicalArchetype = {
  id: "cedar",
  seed: 379,
  branching: {
    spread: 0.55,        // narrow — cedar silhouette
    taper: 0.85,
    droop: 0.25,         // slight droop on branch tips
    upwardBias: 1.5,     // strongly vertical
    stiffness: 0.9,      // very stiff trunk
    segments: 8,
    trunkColor: "#3a3028",  // dark gray-brown, moist bark
    roughness: 0.94,
    trunkHeight: 2.2,        // tall relative trunk
    branchOriginHeight: 0.55, // branches start high
    trunkRadius: 0.22,
  },
  foliage: {
    leafType: "needle",
    aspectRatio: 0.6,
    density: 80,           // sparse per tree — clusters replace density
    colors: ["#3d5042", "#4a6150", "#556a5a", "#617a66", "#2f3e36"],
    scaleRange: [0.5, 1.1],
    flutter: 0.45,         // minimal flutter — stiff needles
    windDrag: 0.3,
  },
  placements: {
    // Hero: left group, tall, near
    hero: [-6, 13, -1],
    midground: [
      [5.5, 10, -4],
      [-2, 9, -6],
    ],
    far: [
      [-9, 11, -10],
      [8, 10, -12],
      [-4, 8, -16],
      [3, 7, -18],
    ],
  },
  qualityMultipliers: { full: 1.0, reduced: 0.4, off: 0.0 },
  canopyShadow: { opacity: 0.25, scale: 0.8, speed: 0.3 },
};

export const botanicalProfiles: Record<string, BotanicalArchetype> = {
  willow: willowProfile,
  maple: mapleProfile,
  ginkgo: ginkgoProfile,
  cedar: cedarProfile,
};
