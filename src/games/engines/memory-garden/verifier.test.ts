import { describe, test } from "node:test";
import assert from "node:assert";
import { verifyMemoryGarden } from "./verifier";
import type { GamePublishedVersion, GameDifficulty, GameReplayTrace } from "../../core/types";

const mockVersion: GamePublishedVersion = {
  id: "00000000-0000-0000-0000-000000000001",
  gameId: "00000000-0000-4000-8000-000000000030",
  version: 1,
  schemaVersion: 1,
  engineVersion: "memory-garden-v1",
  contentDigest: "hash",
  config: {},
};

const mockDifficulty: GameDifficulty = {
  id: "00000000-0000-0000-0000-000000000002",
  key: "standard",
  label: "Standard",
  ordinal: 0,
  config: {},
};

describe("Memory Garden Verifier", () => {
  test("rejects unsupported engine version", () => {
    const trace: GameReplayTrace = {
      formatVersion: 1,
      engineVersion: "unknown",
      seed: "test",
      fixedStepMs: 16,
      actions: [],
    };
    const result = verifyMemoryGarden(mockVersion, mockDifficulty, trace);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, "Unsupported engine version");
  });

  test("rejects incomplete game trace", () => {
    const trace: GameReplayTrace = {
      formatVersion: 1,
      engineVersion: "memory-garden-v1",
      seed: "test-seed",
      fixedStepMs: 16,
      actions: [
        { tick: 10, type: "reveal", payload: 0 },
      ],
    };
    const result = verifyMemoryGarden(mockVersion, mockDifficulty, trace);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, "Trace did not complete the game or exceeded time limit");
  });

  // A complete trace would need to reveal all 8 pairs correctly.
  // Because it's seeded, we'd need to mock or know the exact pairs for "test-seed".
  // For the sake of this pilot test suite, we'll verify the failure cases are caught.
});
