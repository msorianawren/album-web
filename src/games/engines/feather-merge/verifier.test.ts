import { describe, it } from "node:test";
import assert from "node:assert";
import { verifyFeatherMerge } from "./verifier.ts";
import type { GamePublishedVersion, GameDifficulty, GameReplayTrace } from "../../core/types.ts";

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

  it("should verify an early surrender trace and preserve score and duration", () => {
    const trace: GameReplayTrace = {
      formatVersion: 1,
      engineVersion: "feather-merge-v1",
      seed: "test-seed-surrender",
      fixedStepMs: 33,
      actions: [
        { tick: 0, type: "direction", payload: "left" },
        { tick: 1, type: "direction", payload: "up" },
        { tick: 2, type: "direction", payload: "right" },
      ]
    };
    const result = verifyFeatherMerge(mockVersion, mockDifficulty, trace);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.durationTicks, 3);
  });

  it("should handle 0 actions on immediate surrender with valid minimum duration", () => {
    const trace: GameReplayTrace = {
      formatVersion: 1,
      engineVersion: "feather-merge-v1",
      seed: "test-seed-0",
      fixedStepMs: 33,
      actions: []
    };
    const result = verifyFeatherMerge(mockVersion, mockDifficulty, trace);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.durationTicks, 1);
  });
});
