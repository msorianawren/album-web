import type { PuzzleGridSize, PuzzleMode, PuzzleTile, SlidingMove, SwapMove } from "@/lib/puzzles/types";

export function solvedBoard(size: PuzzleGridSize): PuzzleTile[] {
  const tiles: PuzzleTile[] = [...Array(size * size - 1).keys()].map((value) => value + 1);
  return [...tiles, null];
}

export function boardKey(board: PuzzleTile[]) {
  return board.map((tile) => tile ?? 0).join(",");
}

export function isSolved(board: PuzzleTile[]) {
  return board.every((tile, index) => tile === (index === board.length - 1 ? null : index + 1));
}

export function legalSlidingPositions(board: PuzzleTile[], size: PuzzleGridSize) {
  const empty = board.indexOf(null);
  const row = Math.floor(empty / size);
  const col = empty % size;
  return [
    row > 0 ? empty - size : -1,
    row < size - 1 ? empty + size : -1,
    col > 0 ? empty - 1 : -1,
    col < size - 1 ? empty + 1 : -1,
  ].filter((position) => position >= 0);
}

export function moveSlidingTile(board: PuzzleTile[], size: PuzzleGridSize, tile: number) {
  const position = board.indexOf(tile);
  if (position < 0 || !legalSlidingPositions(board, size).includes(position)) return null;
  const empty = board.indexOf(null);
  const next = [...board];
  [next[position], next[empty]] = [next[empty], next[position]];
  return next;
}

export function swapTiles(board: PuzzleTile[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= board.length || to >= board.length) return null;
  const next = [...board];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function seededRandom(seed: string) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function derivePuzzleSeed(challengeId: string, baseSeed: string, mode: PuzzleMode, size: PuzzleGridSize) {
  return `${challengeId}:${baseSeed}:${mode}:${size}`;
}

export function createPuzzleBoard(seed: string, mode: PuzzleMode, size: PuzzleGridSize): PuzzleTile[] {
  const random = seededRandom(seed);
  let board = solvedBoard(size);
  const steps = size * size * (mode === "sliding" ? 22 : 7);

  if (mode === "sliding") {
    for (let index = 0; index < steps; index += 1) {
      const positions = legalSlidingPositions(board, size);
      const position = positions[Math.floor(random() * positions.length)];
      const tile = board[position];
      if (tile !== null) board = moveSlidingTile(board, size, tile) ?? board;
    }
  } else {
    for (let index = 0; index < steps; index += 1) {
      const from = Math.floor(random() * board.length);
      let to = Math.floor(random() * board.length);
      if (to === from) to = (to + 1) % board.length;
      board = swapTiles(board, from, to) ?? board;
    }
  }

  if (isSolved(board)) {
    board = mode === "sliding"
      ? moveSlidingTile(board, size, size * size - 1) ?? board
      : swapTiles(board, 0, 1) ?? board;
  }
  return board;
}

export function replayPuzzleTrace({
  seed,
  mode,
  size,
  trace,
}: {
  seed: string;
  mode: PuzzleMode;
  size: PuzzleGridSize;
  trace: unknown;
}) {
  if (!Array.isArray(trace) || trace.length > 4000) return { valid: false, board: [] as PuzzleTile[], moveCount: 0 };
  let board = createPuzzleBoard(seed, mode, size);

  for (const entry of trace) {
    if (!entry || typeof entry !== "object") return { valid: false, board, moveCount: 0 };
    if (mode === "sliding") {
      const tile = Number((entry as SlidingMove).tile);
      if (!Number.isInteger(tile)) return { valid: false, board, moveCount: 0 };
      const next = moveSlidingTile(board, size, tile);
      if (!next) return { valid: false, board, moveCount: 0 };
      board = next;
    } else {
      const from = Number((entry as SwapMove).from);
      const to = Number((entry as SwapMove).to);
      if (!Number.isInteger(from) || !Number.isInteger(to)) return { valid: false, board, moveCount: 0 };
      const next = swapTiles(board, from, to);
      if (!next) return { valid: false, board, moveCount: 0 };
      board = next;
    }
  }
  return { valid: isSolved(board), board, moveCount: trace.length };
}
