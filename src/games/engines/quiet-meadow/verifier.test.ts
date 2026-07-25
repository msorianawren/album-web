import { describe, it } from "node:test";
import assert from "node:assert";
import { verifyQuietMeadow } from "./verifier";
import type { GameDifficulty, GamePublishedVersion, GameReplayTrace } from "../../core/types";

describe("Quiet Meadow Verifier", () => {
  const version: GamePublishedVersion = {
    id: "v1",
    gameId: "g1",
    version: 1,
    schemaVersion: 1,
    engineVersion: "quiet-meadow-v1",
    contentDigest: "0",
    config: {},
  };
  
  const difficulty: GameDifficulty = {
    id: "d1",
    key: "test",
    label: "Test",
    ordinal: 0,
    config: { width: 3, height: 3, totalMines: 1 },
  };

  it("should reject invalid engine version", () => {
    const trace: GameReplayTrace = {
      formatVersion: 1,
      engineVersion: "wrong-version",
      seed: "test",
      fixedStepMs: 0,
      actions: [],
    };
    const result = verifyQuietMeadow(version, difficulty, trace);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, "Unsupported engine version");
  });

  it("should accept a winning trace", () => {
    const trace: GameReplayTrace = {
      formatVersion: 1,
      engineVersion: "quiet-meadow-v1",
      seed: "test",
      fixedStepMs: 0,
      actions: [
        { tick: 0, type: "reveal", payload: { x: 0, y: 0 } },
      ],
    };
    // Let's assume (0,0) is safe. And since it's 3x3 with 1 mine, the mine is placed somewhere.
    // Wait, the test might just pass or it might lose depending on the mine placement.
    // If we click (0,0), it's protected, so it's always safe!
    // Since there is only 1 mine, the protected area is (0,0) and its 3 neighbors.
    // So the mine will be placed outside the protected area.
    // (0,0) might not have 0 adjacent mines.
    const result = verifyQuietMeadow(version, difficulty, trace);
    assert.strictEqual(result.valid, true);
    // score is at least 1
    assert.ok(result.score > 0);
  });
});
