import { createMemoryGardenState, revealMemoryCard, stepMemoryGarden } from "./model";
import type {
  GameDifficulty,
  GamePublishedVersion,
  GameReplayTrace,
  GameVerificationResult,
} from "../../core/types";
import crypto from "node:crypto";

export function verifyMemoryGarden(
  version: GamePublishedVersion,
  difficulty: GameDifficulty,
  trace: GameReplayTrace,
): GameVerificationResult {
  if (trace.engineVersion !== "memory-garden-v1") {
    return {
      valid: false,
      versionId: version.id,
      replayDigest: "",
      score: 0,
      durationTicks: 0,
      reason: "Unsupported engine version",
    };
  }

  const replayDigest = crypto.createHash("sha256").update(JSON.stringify(trace)).digest("hex");

  // Re-create the deterministic state
  const state = createMemoryGardenState(trace.seed);
  const maxTicks = 36000; // 10 minutes at 60fps
  let finalTick = 0;
  let actionIndex = 0;
  const actions = trace.actions;

  // Run the simulation
  while (!state.complete && finalTick < maxTicks) {
    // Process actions for this tick
    while (actionIndex < actions.length && actions[actionIndex].tick === finalTick) {
      const action = actions[actionIndex];
      if (action.type === "reveal" && typeof action.payload === "number") {
        revealMemoryCard(state, action.payload, finalTick);
      }
      actionIndex++;
    }

    stepMemoryGarden(state, finalTick);
    
    if (state.complete) {
      break;
    }
    
    finalTick++;
  }

  if (!state.complete) {
    return {
      valid: false,
      versionId: version.id,
      replayDigest,
      score: 0,
      durationTicks: finalTick,
      reason: "Trace did not complete the game or exceeded time limit",
    };
  }

  if (actionIndex < actions.length) {
    return {
      valid: false,
      versionId: version.id,
      replayDigest,
      score: 0,
      durationTicks: finalTick,
      reason: "Trace contains extraneous actions after completion",
    };
  }

  // Base score calculation for memory garden
  // 8 pairs = max optimal moves is 8 (16 card reveals)
  // The fewer the moves, the higher the score
  const optimalMoves = 8;
  const actualMoves = state.moves;
  
  // Example score mapping, bounded
  let score = 1000 - ((actualMoves - optimalMoves) * 50);
  if (score < 100) score = 100; // minimum 100 if completed
  if (score > 1000) score = 1000;

  return {
    valid: true,
    versionId: version.id,
    replayDigest,
    score,
    durationTicks: finalTick,
  };
}
