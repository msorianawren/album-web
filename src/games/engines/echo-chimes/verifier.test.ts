import assert from "node:assert";
import { describe, it } from "node:test";
import type { GameDifficulty, GameInputAction, GamePublishedVersion, GameReplayTrace } from "../../core/types.ts";
import { createEchoChimesState, pressChime, stepEchoChimes } from "./model.ts";
import { verifyEchoChimes } from "./verifier.ts";

const version: GamePublishedVersion = {
  id: "echo-v1",
  gameId: "echo",
  version: 1,
  schemaVersion: 1,
  engineVersion: "echo-chimes-v1",
  contentDigest: "0",
  config: {},
};

const difficulty: GameDifficulty = {
  id: "standard",
  key: "standard",
  label: "Standard",
  ordinal: 0,
  config: { targetSequenceLength: 8 },
};

function createRewardTrace(seed: string): GameReplayTrace {
  const state = createEchoChimesState(seed);
  const actions: GameInputAction[] = [];

  for (let tick = 0; !state.complete && tick < 18000; tick += 1) {
    if (state.phase === "waiting_for_input") {
      const note = state.sequence[state.playerProgress];
      actions.push({ tick, type: "press", payload: note });
      pressChime(state, note);
    }
    stepEchoChimes(state);
  }

  assert.equal(state.score, 8);
  assert.equal(state.complete, true);
  return { formatVersion: 1, engineVersion: "echo-chimes-v1", seed, fixedStepMs: 1000 / 60, actions };
}

describe("Echo Chimes verifier", () => {
  it("awards a verified score after the eighth completed chime sequence", () => {
    const result = verifyEchoChimes(version, difficulty, createRewardTrace("echo-reward-seed"));

    assert.equal(result.valid, true);
    assert.equal(result.score, 8);
  });
});
