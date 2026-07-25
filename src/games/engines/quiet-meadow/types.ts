export type QuietMeadowDifficulty = "meadow" | "garden" | "wildfield";

export interface QuietMeadowCell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

export interface QuietMeadowState {
  status: "ready" | "running" | "won" | "lost";
  width: number;
  height: number;
  totalMines: number;
  cells: QuietMeadowCell[];
  revealedCount: number;
  flagCount: number;
  elapsedActions: number;
  seed: string;
}

export interface QuietMeadowConfig {
  width: number;
  height: number;
  totalMines: number;
}
