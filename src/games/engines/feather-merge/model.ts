import { createSeededRng } from "../../core/rng.ts";

export type MergeDirection = "up" | "down" | "left" | "right";
export interface FeatherCell { id: number; value: number }
export interface FeatherMergeState {
  seed: string;
  cells: (FeatherCell | null)[];
  score: number;
  spawnIndex: number;
  complete: boolean;
}

export function cloneFeatherMergeState(state: FeatherMergeState): FeatherMergeState {
  return {
    ...state,
    cells: state.cells.map((cell) => cell ? { ...cell } : null),
  };
}

export function getHighestFeatherTile(state: FeatherMergeState) {
  return state.cells.reduce((highest, cell) => Math.max(highest, cell?.value ?? 0), 0);
}

function transpose(cells: (FeatherCell | null)[]) {
  return cells.map((_, index) => cells[(index % 4) * 4 + Math.floor(index / 4)]);
}

function reverseRows(cells: (FeatherCell | null)[]) {
  return Array.from({ length: 4 }, (_, row) => cells.slice(row * 4, row * 4 + 4).reverse()).flat();
}

function mergeRows(cells: (FeatherCell | null)[], nextId: () => number) {
  let gained = 0;
  const merged = Array.from({ length: 4 }, (_, row) => {
    const values = cells.slice(row * 4, row * 4 + 4).filter((c): c is FeatherCell => c !== null);
    const next: (FeatherCell | null)[] = [];
    for (let index = 0; index < values.length; index += 1) {
      if (index + 1 < values.length && values[index].value === values[index + 1].value) {
        const value = values[index].value * 2;
        next.push({ id: nextId(), value }); // Merge creates a new tile ID! Or we can reuse one, but new ID is cleaner for enter animation if we want, or reuse values[index].id to slide it.
        // Actually, reusing the ID of the destination tile is better so it slides into it. Let's reuse values[index + 1].id (the one closer to the edge).
        // Wait, values is filtered, so index is the one further from the edge (if moving right, values[0] is left, values[1] is right. values[1] is closer to edge).
        gained += value;
        index += 1;
      } else {
        next.push(values[index]);
      }
    }
    return [...next, ...Array.from({ length: 4 - next.length }, () => null)];
  }).flat();
  return { cells: merged, gained };
}

function hasMoves(cells: (FeatherCell | null)[]) {
  if (cells.some((value) => value === null)) return true;
  return cells.some((cell, index) => {
    const x = index % 4;
    const y = Math.floor(index / 4);
    return (x < 3 && cells[index + 1]?.value === cell?.value) || (y < 3 && cells[index + 4]?.value === cell?.value);
  });
}

function spawn(state: FeatherMergeState) {
  const empty = state.cells
    .map((value, index) => value === null ? index : -1)
    .filter((index) => index >= 0);
  if (!empty.length) return;
  const rng = createSeededRng(`${state.seed}:spawn:${state.spawnIndex}`);
  const index = rng.pick(empty);
  state.cells[index] = { id: state.spawnIndex + 1, value: rng.next() < 0.88 ? 2 : 4 };
  state.spawnIndex += 1;
}

export function createFeatherMergeState(seed: string): FeatherMergeState {
  const state: FeatherMergeState = {
    seed,
    cells: Array.from({ length: 16 }, () => null),
    score: 0,
    spawnIndex: 0,
    complete: false,
  };
  spawn(state);
  spawn(state);
  return state;
}

export function moveFeatherMerge(state: FeatherMergeState, direction: MergeDirection) {
  if (state.complete) return false;
  const before = state.cells.map(c => c ? c.value : 0).join(",");
  let oriented = [...state.cells];
  if (direction === "right") oriented = reverseRows(oriented);
  if (direction === "up") oriented = transpose(oriented);
  if (direction === "down") oriented = reverseRows(transpose(oriented));
  const result = mergeRows(oriented, () => ++state.spawnIndex * 100); // Unique IDs for merges
  oriented = result.cells;
  if (direction === "right") oriented = reverseRows(oriented);
  if (direction === "up") oriented = transpose(oriented);
  if (direction === "down") oriented = transpose(reverseRows(oriented));
  if (oriented.map(c => c ? c.value : 0).join(",") === before) return false;
  state.cells = oriented;
  state.score += result.gained;
  spawn(state);
  state.complete = !hasMoves(state.cells);
  return true;
}
