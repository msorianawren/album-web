import { createSeededRng } from "../../core/rng.ts";

export interface MemoryCard {
  id: number;
  pair: number;
  revealed: boolean;
  matched: boolean;
}

export interface MemoryGardenState {
  seed: string;
  cards: MemoryCard[];
  selected: number[];
  cursor: number;
  moves: number;
  pairs: number;
  streak: number;
  lastMatchTick: number;
  mismatchUntilTick: number | null;
  complete: boolean;
}

export function createMemoryGardenState(seed: string): MemoryGardenState {
  const rng = createSeededRng(seed);
  const pairs = Array.from({ length: 8 }, (_, pair) => [pair, pair]).flat();
  for (let index = pairs.length - 1; index > 0; index -= 1) {
    const swap = rng.integer(0, index);
    [pairs[index], pairs[swap]] = [pairs[swap], pairs[index]];
  }
  return {
    seed,
    cards: pairs.map((pair, id) => ({ id, pair, revealed: false, matched: false })),
    selected: [],
    cursor: 0,
    moves: 0,
    pairs: 0,
    streak: 0,
    lastMatchTick: -1,
    mismatchUntilTick: null,
    complete: false,
  };
}

export function moveMemoryCursor(state: MemoryGardenState, dx: number, dy: number) {
  const x = state.cursor % 4;
  const y = Math.floor(state.cursor / 4);
  state.cursor = ((y + dy + 4) % 4) * 4 + ((x + dx + 4) % 4);
}

export function revealMemoryCard(state: MemoryGardenState, index: number, tick: number) {
  if (state.complete || state.mismatchUntilTick !== null) return false;
  const card = state.cards[index];
  if (!card || card.revealed || card.matched) return false;
  card.revealed = true;
  state.selected.push(index);
  if (state.selected.length === 2) {
    state.moves += 1;
    const [first, second] = state.selected.map((selected) => state.cards[selected]);
    if (first.pair === second.pair) {
      first.matched = true;
      second.matched = true;
      state.selected = [];
      state.pairs += 1;
      state.streak += 1;
      state.lastMatchTick = tick;
      state.complete = state.pairs === 8;
    } else {
      state.streak = 0;
      state.mismatchUntilTick = tick + 42;
    }
  }
  return true;
}

export function stepMemoryGarden(state: MemoryGardenState, tick: number) {
  if (state.mismatchUntilTick === null || tick < state.mismatchUntilTick) return false;
  state.selected.forEach((index) => {
    state.cards[index].revealed = false;
  });
  state.selected = [];
  state.mismatchUntilTick = null;
  return true;
}
