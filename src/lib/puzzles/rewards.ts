import type { PuzzleGridSize, PuzzleMode, PuzzleTargets } from "@/lib/puzzles/types";

const baseRewards: Record<PuzzleGridSize, number> = { 3: 10, 4: 25, 5: 50 };
const modeMultipliers: Record<PuzzleMode, number> = { sliding: 1, swap: 0.9 };

export function calculatePuzzleReward({
  gridSize,
  mode,
  multiplier,
  elapsedMs,
  moveCount,
  targets,
}: {
  gridSize: PuzzleGridSize;
  mode: PuzzleMode;
  multiplier: number;
  elapsedMs: number;
  moveCount: number;
  targets: PuzzleTargets;
}) {
  const target = targets[String(gridSize)] ?? { seconds: 0, moves: 0 };
  const base = baseRewards[gridSize] * modeMultipliers[mode] * Math.min(2, Math.max(0.5, multiplier));
  const timeBonus = target.seconds > 0 && elapsedMs <= target.seconds * 1000 ? base * 0.2 : 0;
  const moveBonus = target.moves > 0 && moveCount <= target.moves ? base * 0.2 : 0;
  return Math.min(100, Math.max(5, Math.round(base + timeBonus + moveBonus)));
}

export function estimatePuzzleReward(gridSize: PuzzleGridSize, mode: PuzzleMode, multiplier: number) {
  return calculatePuzzleReward({ gridSize, mode, multiplier, elapsedMs: Number.MAX_SAFE_INTEGER, moveCount: Number.MAX_SAFE_INTEGER, targets: {} });
}
