import type { GameDifficulty, GamePublishedVersion, GameReplayTrace, GameVerificationResult } from "../../core/types";
import { createZenCairnState, stepZenCairn, dropStone } from "./model";

export function verifyZenCairn(
  version: GamePublishedVersion,
  difficulty: GameDifficulty,
  trace: GameReplayTrace,
): GameVerificationResult {
  if (trace.engineVersion !== "zen-cairn-v1") {
    return { valid: false, reason: "Unsupported engine version", versionId: version.id, replayDigest: "0", score: 0, durationTicks: 0 };
  }

  const state = createZenCairnState(trace.seed);
  let traceIndex = 0;
  
  const MAX_TICKS = 36000;
  let tick = 0;

  for (; tick < MAX_TICKS && !state.complete; tick++) {
    while (traceIndex < trace.actions.length && trace.actions[traceIndex].tick === tick) {
      const action = trace.actions[traceIndex];
      if (action.type === "drop") {
        dropStone(state);
      }
      traceIndex++;
    }
    stepZenCairn(state);
  }

  if (traceIndex < trace.actions.length) {
    return { valid: false, reason: "Extraneous actions after game completion", versionId: version.id, replayDigest: "0", score: 0, durationTicks: 0 };
  }

  return {
    valid: true,
    versionId: version.id,
    replayDigest: "0",
    score: state.score < 12 ? 0 : state.score,
    durationTicks: tick,
  };
}
