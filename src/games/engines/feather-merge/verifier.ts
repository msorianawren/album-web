import type { GameDifficulty, GamePublishedVersion, GameReplayTrace, GameVerificationResult } from "../../core/types";
import { createFeatherMergeState, moveFeatherMerge, type MergeDirection } from "./model";

export function verifyFeatherMerge(
  version: GamePublishedVersion,
  difficulty: GameDifficulty,
  trace: GameReplayTrace,
): GameVerificationResult {
  if (trace.engineVersion !== "feather-merge-v1") {
    return { valid: false, reason: "Unsupported engine version", versionId: version.id, replayDigest: "0", score: 0, durationTicks: 0 };
  }

  const state = createFeatherMergeState(trace.seed);
  let step = 0;

  for (const action of trace.actions) {
    if (state.complete) {
      return { valid: false, reason: "Extraneous actions after game completion", versionId: version.id, replayDigest: "0", score: 0, durationTicks: 0 };
    }
    
    if (action.type === "direction") {
      moveFeatherMerge(state, action.payload as MergeDirection);
      step++;
    }
  }

  // Feather merge can end voluntarily if the player has no moves,
  // or they just submit whatever they achieved. Let's assume the trace contains the complete run.
  return {
    valid: true,
    versionId: version.id,
    replayDigest: "0",
    score: state.score < 500 ? 0 : state.score,
    durationTicks: step,
  };
}
