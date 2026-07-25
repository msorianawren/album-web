import { createSeededRng } from "@/games/core/rng";

export type EchoChimesState = {
  seed: string;
  sequence: number[];
  playerProgress: number;
  score: number;
  phase: "playing_sequence" | "waiting_for_input" | "success_pause" | "game_over";
  activeChime: number | null;
  tickCounter: number;
  complete: boolean;
};

export function createEchoChimesState(seed: string): EchoChimesState {
  const state: EchoChimesState = {
    seed,
    sequence: [],
    playerProgress: 0,
    score: 0,
    phase: "success_pause",
    activeChime: null,
    tickCounter: 0,
    complete: false,
  };
  
  // Initialize with the first note
  appendSequence(state);
  return state;
}

function appendSequence(state: EchoChimesState) {
  const rng = createSeededRng(state.seed + state.sequence.length);
  const nextNote = Math.floor(rng.next() * 4);
  state.sequence.push(nextNote);
}

export function stepEchoChimes(state: EchoChimesState) {
  if (state.complete) return;

  if (state.phase === "success_pause") {
    state.tickCounter++;
    if (state.tickCounter > 30) {
      state.phase = "playing_sequence";
      state.tickCounter = 0;
      state.activeChime = null;
    }
  } else if (state.phase === "playing_sequence") {
    state.tickCounter++;
    
    // Each note takes 45 ticks (30 ticks on, 15 ticks off)
    const noteIndex = Math.floor(state.tickCounter / 45);
    const tickInNote = state.tickCounter % 45;

    if (noteIndex >= state.sequence.length) {
      state.phase = "waiting_for_input";
      state.activeChime = null;
      state.tickCounter = 0;
    } else {
      if (tickInNote < 30) {
        state.activeChime = state.sequence[noteIndex];
      } else {
        state.activeChime = null;
      }
    }
  } else if (state.phase === "game_over") {
    state.tickCounter++;
    if (state.tickCounter > 60) {
      state.complete = true;
    }
  }
}

export function pressChime(state: EchoChimesState, chimeIndex: number): boolean {
  if (state.phase !== "waiting_for_input" || state.complete) return false;

  const expectedNote = state.sequence[state.playerProgress];
  
  if (chimeIndex === expectedNote) {
    state.playerProgress++;
    
    if (state.playerProgress === state.sequence.length) {
      // Completed the sequence successfully
      state.score = state.sequence.length;
      state.playerProgress = 0;
      appendSequence(state);
      state.phase = "success_pause";
      state.tickCounter = 0;
      state.activeChime = null;
    }
    return true; // Correct press
  } else {
    // Wrong press
    state.phase = "game_over";
    state.tickCounter = 0;
    state.activeChime = chimeIndex; // Show the wrong one they pressed
    return false; // Wrong press
  }
}
