import type { GameDifficulty, GamePublishedVersion, GameReplayTrace, GameVerificationResult } from "../../core/types";
import { createEchoChimesState, stepEchoChimes, pressChime } from "./model";

export function verifyEchoChimes(
  version: GamePublishedVersion,
  difficulty: GameDifficulty,
  trace: GameReplayTrace,
): GameVerificationResult {
  if (trace.engineVersion !== "echo-chimes-v1") {
    return { valid: false, reason: "Unsupported engine version", versionId: version.id, replayDigest: "0", score: 0, durationTicks: 0 };
  }

  const state = createEchoChimesState(trace.seed);
  let traceIndex = 0;
  
  const MAX_TICKS = 18000;
  let tick = 0;

  for (; tick < MAX_TICKS && !state.complete; tick++) {
    while (traceIndex < trace.actions.length && trace.actions[traceIndex].tick === tick) {
      const action = trace.actions[traceIndex];
      if (action.type === "press") {
        pressChime(state, action.payload as number);
      }
      traceIndex++;
    }
    stepEchoChimes(state);
  }

  if (traceIndex < trace.actions.length) {
    return { valid: false, reason: "Extraneous actions after game completion", versionId: version.id, replayDigest: "0", score: 0, durationTicks: 0 };
  }

  return {
    valid: true,
    versionId: version.id,
    replayDigest: "0",
    score: state.score < 8 ? 0 : state.score,
    durationTicks: tick,
  };
}
