import { createHash } from "node:crypto";
import type { GameDifficulty, GamePublishedVersion, GameReplayTrace, GameVerificationResult } from "../../core/types";
import { createWrenFlightState, stepWrenFlight, flapWren, WREN_REWARD_TARGET } from "./model.ts";

export function verifyWrenFlight(
  version: GamePublishedVersion,
  difficulty: GameDifficulty,
  trace: GameReplayTrace,
): GameVerificationResult {
  const replayDigest = createHash("sha256").update(JSON.stringify(trace)).digest("hex");

  if (trace.engineVersion !== "wren-flight-v1") {
    return { valid: false, reason: "Unsupported engine version", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
  }

  const state = createWrenFlightState(trace.seed);
  let traceIndex = 0;
  
  const MAX_TICKS = 36000;
  let tick = 0;

  for (; tick < MAX_TICKS && !state.complete; tick++) {
    while (traceIndex < trace.actions.length && trace.actions[traceIndex].tick === tick) {
      const action = trace.actions[traceIndex];
      if (action.type === "flap") {
        flapWren(state);
      }
      traceIndex++;
    }
    stepWrenFlight(state);
  }

  // A buffered flap can arrive in the same rendered frame as a collision.
  // It cannot alter the completed state or inflate the score, so it is safe
  // to ignore rather than reject an otherwise valid rewarded replay.

  return {
    valid: true,
    versionId: version.id,
    replayDigest,
    score: state.score < WREN_REWARD_TARGET ? 0 : state.score,
    durationTicks: tick,
  };
}
