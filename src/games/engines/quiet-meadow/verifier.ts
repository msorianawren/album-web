import { createHash } from "node:crypto";
import type { GameDifficulty, GamePublishedVersion, GameReplayTrace, GameVerificationResult } from "../../core/types";
import { chordReveal, createQuietMeadowState, revealCell, toggleFlag } from "./model";
import type { QuietMeadowActionPayload } from "./trace";
import type { QuietMeadowConfig } from "./types";

export function verifyQuietMeadow(
  version: GamePublishedVersion,
  difficulty: GameDifficulty,
  trace: GameReplayTrace,
): GameVerificationResult {
  const replayDigest = createHash("sha256").update(JSON.stringify(trace)).digest("hex");

  if (trace.engineVersion !== "quiet-meadow-v1") {
    return { valid: false, reason: "Unsupported engine version", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
  }

  const config = difficulty.config as unknown as QuietMeadowConfig;
  if (typeof config.width !== "number" || typeof config.height !== "number" || typeof config.totalMines !== "number") {
    return { valid: false, reason: "Invalid difficulty config", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
  }

  const state = createQuietMeadowState(config, trace.seed);
  let lastTick = -1;

  for (const action of trace.actions) {
    if (action.tick <= lastTick) {
      return { valid: false, reason: "Invalid action sequence", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
    }
    lastTick = action.tick;

    if (state.status === "won" || state.status === "lost") {
      return { valid: false, reason: "Action after terminal state", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
    }

    const payload = action.payload as QuietMeadowActionPayload;
    if (!payload || typeof payload.x !== "number" || typeof payload.y !== "number") {
      return { valid: false, reason: "Invalid action payload", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
    }

    if (payload.x < 0 || payload.x >= config.width || payload.y < 0 || payload.y >= config.height) {
      return { valid: false, reason: "Coordinate out of bounds", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
    }

    let success = false;
    if (action.type === "reveal") {
      success = revealCell(state, payload.x, payload.y);
    } else if (action.type === "flag" || action.type === "question" || action.type === "unflag") {
      success = toggleFlag(state, payload.x, payload.y);
    } else if (action.type === "chord") {
      success = chordReveal(state, payload.x, payload.y);
    } else {
      return { valid: false, reason: "Unknown action type", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
    }

    if (!success) {
      return { valid: false, reason: "Invalid action ignored by engine", versionId: version.id, replayDigest, score: 0, durationTicks: 0 };
    }
  }

  const score = state.revealedCount;

  return {
    valid: true,
    versionId: version.id,
    replayDigest,
    score: score,
    durationTicks: trace.actions.length,
    metadata: {
      status: state.status,
      revealed: state.revealedCount,
      flags: state.flagCount,
    }
  };
}
