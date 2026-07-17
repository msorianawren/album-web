export const puzzleModes = ["sliding", "swap"] as const;
export const puzzleGridSizes = [3, 4, 5] as const;
export const puzzleCollections = ["featured", "editorial_portraits", "traditional_elegance", "travel_stories", "seasonal"] as const;

export type PuzzleMode = (typeof puzzleModes)[number];
export type PuzzleGridSize = (typeof puzzleGridSizes)[number];
export type PuzzleCollection = (typeof puzzleCollections)[number];
export type PuzzleVisibility = "public" | "members";
export type PuzzleChallengeStatus = "draft" | "published" | "archived";
export type PuzzleSourceType = "album_media" | "game_asset";
export type PuzzleTile = number | null;
export type SlidingMove = { tile: number };
export type SwapMove = { from: number; to: number };
export type PuzzleTrace = SlidingMove[] | SwapMove[];

export interface PuzzleTargets {
  [grid: string]: { seconds: number; moves: number };
}

export interface PuzzleChallenge {
  id: string;
  title: string;
  description: string;
  collection: PuzzleCollection;
  sourceType: PuzzleSourceType;
  sourceMediaId: string | null;
  puzzleAssetKey?: string | null;
  previewAssetKey?: string | null;
  imageUrl: string | null;
  previewUrl: string | null;
  focalX: number;
  focalY: number;
  allowedModes: PuzzleMode[];
  allowedGridSizes: PuzzleGridSize[];
  visibility: PuzzleVisibility;
  targets: PuzzleTargets;
  rewardMultiplier: number;
  baseSeed: string;
  status: PuzzleChallengeStatus;
  publishedAt: string | null;
}

export interface PuzzleAttemptStart {
  attemptId: string;
  seed: string;
  startedAt: string;
}

export interface PuzzleResult {
  bestTimeMs: number | null;
  bestMoveCount: number | null;
  bestReward: number;
  completionCount: number;
}

export const collectionLabels: Record<PuzzleCollection, string> = {
  featured: "Featured Collections",
  editorial_portraits: "Editorial Portraits",
  traditional_elegance: "Traditional Elegance",
  travel_stories: "Travel Stories",
  seasonal: "Seasonal Collections",
};
