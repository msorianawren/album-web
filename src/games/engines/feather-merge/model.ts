import { createSeededRng } from "../../core/rng.ts";

export type MergeDirection = "up" | "down" | "left" | "right";
export interface FeatherMergeState {
  seed: string;
  cells: number[];
  score: number;
  spawnIndex: number;
  complete: boolean;
}

function transpose(cells: number[]) {
  return cells.map((_, index) => cells[(index % 4) * 4 + Math.floor(index / 4)]);
}

function reverseRows(cells: number[]) {
  return Array.from({ length: 4 }, (_, row) => cells.slice(row * 4, row * 4 + 4).reverse()).flat();
}

function mergeRows(cells: number[]) {
  let gained = 0;
  const merged = Array.from({ length: 4 }, (_, row) => {
    const values = cells.slice(row * 4, row * 4 + 4).filter(Boolean);
    const next: number[] = [];
    for (let index = 0; index < values.length; index += 1) {
      if (values[index] === values[index + 1]) {
        const value = values[index] * 2;
        next.push(value);
        gained += value;
        index += 1;
      } else {
        next.push(values[index]);
      }
    }
    return [...next, ...Array.from({ length: 4 - next.length }, () => 0)];
  }).flat();
  return { cells: merged, gained };
}

function hasMoves(cells: number[]) {
  if (cells.some((value) => value === 0)) return true;
  return cells.some((value, index) => {
    const x = index % 4;
    const y = Math.floor(index / 4);
    return (x < 3 && cells[index + 1] === value) || (y < 3 && cells[index + 4] === value);
  });
}

function spawn(state: FeatherMergeState) {
  const empty = state.cells
    .map((value, index) => value === 0 ? index : -1)
    .filter((index) => index >= 0);
  if (!empty.length) return;
  const rng = createSeededRng(`${state.seed}:spawn:${state.spawnIndex}`);
  const index = rng.pick(empty);
  state.cells[index] = rng.next() < 0.88 ? 2 : 4;
  state.spawnIndex += 1;
}

export function createFeatherMergeState(seed: string): FeatherMergeState {
  const state = {
    seed,
    cells: Array.from({ length: 16 }, () => 0),
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
  const before = state.cells.join(",");
  let oriented = [...state.cells];
  if (direction === "right") oriented = reverseRows(oriented);
  if (direction === "up") oriented = transpose(oriented);
  if (direction === "down") oriented = reverseRows(transpose(oriented));
  const result = mergeRows(oriented);
  oriented = result.cells;
  if (direction === "right") oriented = reverseRows(oriented);
  if (direction === "up") oriented = transpose(oriented);
  if (direction === "down") oriented = transpose(reverseRows(oriented));
  if (oriented.join(",") === before) return false;
  state.cells = oriented;
  state.score += result.gained;
  spawn(state);
  state.complete = !hasMoves(state.cells);
  return true;
}
