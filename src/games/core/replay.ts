import { normalizeInputActions } from "./input.ts";
import type { GameReplayTrace } from "./types.ts";

const MAX_REPLAY_BYTES = 256 * 1024;

export function serializeReplay(trace: GameReplayTrace) {
  const normalized: GameReplayTrace = {
    ...trace,
    actions: normalizeInputActions(trace.actions),
  };
  const serialized = JSON.stringify(normalized);
  if (new TextEncoder().encode(serialized).byteLength > MAX_REPLAY_BYTES) {
    throw new RangeError("Replay payload exceeds the maximum size.");
  }
  return serialized;
}

export function parseReplay(value: string): GameReplayTrace {
  if (new TextEncoder().encode(value).byteLength > MAX_REPLAY_BYTES) {
    throw new RangeError("Replay payload exceeds the maximum size.");
  }
  const parsed = JSON.parse(value) as Partial<GameReplayTrace>;
  if (
    parsed.formatVersion !== 1
    || typeof parsed.engineVersion !== "string"
    || typeof parsed.seed !== "string"
    || typeof parsed.fixedStepMs !== "number"
    || !Number.isFinite(parsed.fixedStepMs)
    || !Array.isArray(parsed.actions)
  ) {
    throw new TypeError("Replay payload is not compatible with format version 1.");
  }
  return {
    formatVersion: 1,
    engineVersion: parsed.engineVersion,
    seed: parsed.seed,
    fixedStepMs: parsed.fixedStepMs,
    actions: normalizeInputActions(parsed.actions),
  };
}
