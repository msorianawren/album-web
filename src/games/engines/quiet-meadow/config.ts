import type { QuietMeadowConfig, QuietMeadowDifficulty } from "./types";

export const quietMeadowDifficulties: Record<QuietMeadowDifficulty, QuietMeadowConfig> = {
  meadow: { width: 9, height: 9, totalMines: 10 },
  garden: { width: 12, height: 12, totalMines: 20 },
  wildfield: { width: 16, height: 16, totalMines: 40 },
};

export function isValidConfig(width: number, height: number, totalMines: number): boolean {
  if (width <= 0 || height <= 0) return false;
  if (totalMines <= 0) return false;
  
  // The first revealed cell and its 8 neighbors (up to 9 cells) are protected if possible.
  // Actually, standard minesweeper protects the first clicked cell from being a mine.
  // Many implementations protect the 3x3 area around it.
  // Let's ensure there are more cells than mines + 9.
  const totalCells = width * height;
  if (totalMines >= totalCells - 8) return false;

  return true;
}
