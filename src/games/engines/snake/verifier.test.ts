import { describe, it } from "node:test";
import assert from "node:assert";
import { verifySnake } from "./verifier";
import type { GamePublishedVersion, GameDifficulty, GameReplayTrace } from "../../core/types";

describe("Snake Verifier", () => {
  const mockVersion: GamePublishedVersion = {
    id: "v1", gameId: "g1", version: 1, schemaVersion: 1, engineVersion: "snake-v1",
    contentDigest: "0", config: { board_size: 16 }
  };
  const mockDifficulty: GameDifficulty = { id: "d1", key: "standard", label: "Standard", ordinal: 0, config: {} };

  it("should verify a valid completed snake trace", () => {
    // Generate a quick synthetic trace. We can just use seed and let it run into a wall for completeness.
    const trace: GameReplayTrace = {
      formatVersion: 1,
      engineVersion: "snake-v1",
      seed: "test-seed-1",
      fixedStepMs: 100,
      actions: [
        { tick: 2, type: "direction", payload: "down" },
        { tick: 4, type: "direction", payload: "right" }
      ]
    };
    const result = verifySnake(mockVersion, mockDifficulty, trace);
    assert.strictEqual(result.valid, true);
    // As long as it finishes properly without extraneous actions.
  });

  it("should fail an invalid engine version", () => {
    const trace: GameReplayTrace = {
      formatVersion: 1,
      engineVersion: "invalid",
      seed: "test-seed",
      fixedStepMs: 100,
      actions: []
    };
    const result = verifySnake(mockVersion, mockDifficulty, trace);
    assert.strictEqual(result.valid, false);
  });
});
