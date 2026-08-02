import { createHash } from "node:crypto";
import type { GameDifficulty, GamePublishedVersion, GameReplayTrace, GameVerificationResult } from "../../core/types.ts";
import { createFeatherMergeState, moveFeatherMerge, type MergeDirection } from "./model.ts";

export function verifyFeatherMerge(
  version: GamePublishedVersion,
  difficulty: GameDifficulty,
  trace: GameReplayTrace,
): GameVerificationResult {
  const replayDigest = createHash("sha256").update(JSON.stringify(trace)).digest("hex");

  if (trace.engineVersion !== "feather-merge-v1") {
    return { valid: false, reason: "Unsupported engine version", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
  }

  const state = createFeatherMergeState(trace.seed);
  let step = 0;

  for (const action of trace.actions) {
    if (state.complete) {
      return { valid: false, reason: "Extraneous actions after game completion", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
    }
    
    if (action.type === "direction") {
      moveFeatherMerge(state, action.payload as MergeDirection);
      step++;
    }
  }

  return {
    valid: true,
    versionId: version.id,
    replayDigest,
    score: state.score < 500 ? 0 : state.score,
    durationTicks: Math.max(1, step),
  };
}
