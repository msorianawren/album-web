import { describe, it } from "node:test";
import assert from "node:assert";
import { verifyFeatherMerge } from "./verifier";
import type { GamePublishedVersion, GameDifficulty, GameReplayTrace } from "../../core/types";

describe("Feather Merge Verifier", () => {
  const mockVersion: GamePublishedVersion = {
    id: "v1", gameId: "g1", version: 1, schemaVersion: 1, engineVersion: "feather-merge-v1",
    contentDigest: "0", config: { board_size: 4 }
  };
  const mockDifficulty: GameDifficulty = { id: "d1", key: "standard", label: "Standard", ordinal: 0, config: {} };

  it("should verify a valid feather merge trace", () => {
    const trace: GameReplayTrace = {
      formatVersion: 1,
      engineVersion: "feather-merge-v1",
      seed: "test-seed-1",
      fixedStepMs: 33,
      actions: [
        { tick: 0, type: "direction", payload: "down" },
        { tick: 0, type: "direction", payload: "right" }
      ]
    };
    const result = verifyFeatherMerge(mockVersion, mockDifficulty, trace);
    assert.strictEqual(result.valid, true);
  });

  it("should fail an invalid engine version", () => {
    const trace: GameReplayTrace = {
      formatVersion: 1,
      engineVersion: "invalid",
      seed: "test-seed",
      fixedStepMs: 33,
      actions: []
    };
    const result = verifyFeatherMerge(mockVersion, mockDifficulty, trace);
    assert.strictEqual(result.valid, false);
  });
});
