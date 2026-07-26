import { createSeededRng } from "../../core/rng";
import type { QuietMeadowConfig, QuietMeadowState, QuietMeadowCell } from "./types";

export function createQuietMeadowState(config: QuietMeadowConfig, seed: string): QuietMeadowState {
  const cells: QuietMeadowCell[] = Array.from({ length: config.width * config.height }, () => ({
    isMine: false,
    isRevealed: false,
    isFlagged: false,
    isQuestioned: false,
    adjacentMines: 0,
  }));

  return {
    status: "ready",
    width: config.width,
    height: config.height,
    totalMines: config.totalMines,
    cells,
    revealedCount: 0,
    flagCount: 0,
    elapsedActions: 0,
    seed,
  };
}

function getNeighbors(x: number, y: number, width: number, height: number): [number, number][] {
  const neighbors: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push([nx, ny]);
      }
    }
  }
  return neighbors;
}

function placeMines(state: QuietMeadowState, firstX: number, firstY: number) {
  const { width, height, totalMines, seed } = state;
  const rng = createSeededRng(seed);
  
  const totalCells = width * height;
  const firstIndex = firstY * width + firstX;
  
  // Determine protected indices (first cell + neighbors if possible)
  const neighbors = getNeighbors(firstX, firstY, width, height).map(([nx, ny]) => ny * width + nx);
  const protectedIndices = new Set([firstIndex]);
  
  // If we have enough space to protect neighbors, protect them
  if (totalCells - (1 + neighbors.length) >= totalMines) {
    for (const n of neighbors) {
      protectedIndices.add(n);
    }
  }

  // Create an array of available indices
  const availableIndices: number[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (!protectedIndices.has(i)) {
      availableIndices.push(i);
    }
  }

  // Shuffle available indices with RNG to pick mines
  for (let i = availableIndices.length - 1; i > 0; i--) {
    const j = rng.integer(0, i);
    const temp = availableIndices[i];
    availableIndices[i] = availableIndices[j];
    availableIndices[j] = temp;
  }

  // Take the first totalMines from shuffled available
  for (let i = 0; i < totalMines; i++) {
    state.cells[availableIndices[i]].isMine = true;
  }

  // Calculate adjacent mines
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (state.cells[idx].isMine) continue;
      let count = 0;
      for (const [nx, ny] of getNeighbors(x, y, width, height)) {
        if (state.cells[ny * width + nx].isMine) count++;
      }
      state.cells[idx].adjacentMines = count;
    }
  }
}

function checkWinCondition(state: QuietMeadowState) {
  const safeCells = state.width * state.height - state.totalMines;
  if (state.revealedCount === safeCells) {
    state.status = "won";
  }
}

export function revealCell(state: QuietMeadowState, x: number, y: number): boolean {
  if (state.status === "lost" || state.status === "won") return false;
  if (x < 0 || x >= state.width || y < 0 || y >= state.height) return false;
  
  const index = y * state.width + x;
  const cell = state.cells[index];
  
  if (cell.isRevealed || cell.isFlagged) return false;

  state.elapsedActions++;

  if (state.status === "ready") {
    placeMines(state, x, y);
    state.status = "running";
  }

  if (cell.isMine) {
    cell.isRevealed = true;
    state.status = "lost";
    return true;
  }

  // Flood fill
  const stack = [[x, y]];
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    const cIndex = cy * state.width + cx;
    const cCell = state.cells[cIndex];
    
    if (!cCell.isRevealed && !cCell.isFlagged && !cCell.isMine) {
      cCell.isRevealed = true;
      state.revealedCount++;
      
      if (cCell.adjacentMines === 0) {
        for (const [nx, ny] of getNeighbors(cx, cy, state.width, state.height)) {
          stack.push([nx, ny]);
        }
      }
    }
  }

  checkWinCondition(state);
  return true;
}

export function toggleFlag(state: QuietMeadowState, x: number, y: number): boolean {
  if (state.status === "lost" || state.status === "won") return false;
  if (x < 0 || x >= state.width || y < 0 || y >= state.height) return false;
  
  const index = y * state.width + x;
  const cell = state.cells[index];
  
  if (cell.isRevealed) return false;

  state.elapsedActions++;
  if (!cell.isFlagged && !cell.isQuestioned) {
    cell.isFlagged = true;
    state.flagCount++;
  } else if (cell.isFlagged) {
    cell.isFlagged = false;
    cell.isQuestioned = true;
    state.flagCount--;
  } else {
    cell.isQuestioned = false;
  }

  // Start the game if the first action is a flag, though mines won't be placed until a reveal.
  if (state.status === "ready") {
    state.status = "running";
  }

  return true;
}

export function chordReveal(state: QuietMeadowState, x: number, y: number): boolean {
  if (state.status !== "running" || x < 0 || x >= state.width || y < 0 || y >= state.height) return false;
  const center = state.cells[y * state.width + x];
  if (!center.isRevealed || center.adjacentMines === 0) return false;
  const neighbors = getNeighbors(x, y, state.width, state.height);
  if (neighbors.filter(([nx, ny]) => state.cells[ny * state.width + nx].isFlagged).length !== center.adjacentMines) return false;
  let changed = false;
  for (const [nx, ny] of neighbors) {
    const neighbor = state.cells[ny * state.width + nx];
    if (!neighbor.isRevealed && !neighbor.isFlagged) changed = revealCell(state, nx, ny) || changed;
  }
  return changed;
}
