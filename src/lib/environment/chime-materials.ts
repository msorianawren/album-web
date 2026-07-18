export type EnvironmentChimeMaterial = "silver" | "champagne" | "bronze" | "bamboo";

export type ChimeMaterialProfile = {
  color: string;
  secondary: string;
  metalness: number;
  roughness: number;
  partials: readonly number[];
  decay: number;
  brightness: number;
};

export const CHIME_MATERIALS: Record<EnvironmentChimeMaterial, ChimeMaterialProfile> = {
  silver: { color: "#e8edf0", secondary: "#aeb9c0", metalness: .92, roughness: .2, partials: [1, 2.72, 4.08, 5.44], decay: 3.2, brightness: 1.15 },
  champagne: { color: "#eadabc", secondary: "#c8aa76", metalness: .84, roughness: .24, partials: [1, 2.38, 3.92, 5.21], decay: 3.45, brightness: 1 },
  bronze: { color: "#b98550", secondary: "#765034", metalness: .78, roughness: .28, partials: [.5, 1, 2.1, 3.35], decay: 4.1, brightness: .82 },
  bamboo: { color: "#b99058", secondary: "#735334", metalness: .02, roughness: .72, partials: [1, 1.52, 2.14], decay: 1.25, brightness: .58 },
};
