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
  config: { targetSequenceLength: 3 },
};

function createRewardTrace(seed: string): GameReplayTrace {
  const state = createEchoChimesState(seed);
  const actions: GameInputAction[] = [];

  for (let tick = 0; !state.complete && tick < 18000; tick += 1) {
    if (state.phase === "waiting_for_input") {
      const note = state.sequence[state.playerProgress];
      const shouldEndRun = state.score >= 3 && state.playerProgress === 0;
      const pressedNote = shouldEndRun ? (note + 1) % 8 : note;
      actions.push({ tick, type: "press", payload: pressedNote });
      pressChime(state, pressedNote);
    }
    stepEchoChimes(state);
  }

  assert.equal(state.score, 3);
  assert.equal(state.complete, true);
  return { formatVersion: 1, engineVersion: "echo-chimes-v1", seed, fixedStepMs: 1000 / 60, actions };
}

describe("Echo Chimes verifier", () => {
  it("keeps playing after the third completed melody and preserves its reward score", () => {
    const result = verifyEchoChimes(version, difficulty, createRewardTrace("echo-reward-seed"));

    assert.equal(result.valid, true);
    assert.equal(result.score, 3);
  });
});
