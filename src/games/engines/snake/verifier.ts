import type { GameDifficulty, GamePublishedVersion, GameReplayTrace, GameVerificationResult } from "../../core/types";
import { createSnakeState, queueSnakeDirection, stepSnake, type SnakeDirection } from "./model";

export function verifySnake(
  version: GamePublishedVersion,
  difficulty: GameDifficulty,
  trace: GameReplayTrace,
): GameVerificationResult {
  if (trace.engineVersion !== "snake-v1") {
    return { valid: false, reason: "Unsupported engine version", versionId: version.id, replayDigest: "0", score: 0, durationTicks: 0 };
  }

  // The client trace should contain a list of actions with a tick.
  // We simulate the fixed step loop.
  const state = createSnakeState(trace.seed);
  let traceIndex = 0;
  
  // Replay loop with a safety upper bound (e.g., 30 minutes at 100ms/step = 18000 ticks)
  const MAX_TICKS = 18000;
  let tick = 0;

  for (; tick < MAX_TICKS && !state.complete; tick++) {
    // Apply any actions meant for this tick
    while (traceIndex < trace.actions.length && trace.actions[traceIndex].tick === tick) {
      const action = trace.actions[traceIndex];
      if (action.type === "direction") {
        queueSnakeDirection(state, action.payload as SnakeDirection);
      }
      traceIndex++;
    }
    stepSnake(state);
  }

  if (traceIndex < trace.actions.length) {
    return { valid: false, reason: "Extraneous actions after game completion", versionId: version.id, replayDigest: "0", score: 0, durationTicks: 0 };
  }

  // In snake, completing the game usually means hitting a wall or tail.
  return {
    valid: true,
    versionId: version.id,
    replayDigest: "0",
    score: state.score,
    durationTicks: tick,
  };
}
