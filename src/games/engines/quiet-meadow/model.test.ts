import { describe, it } from "node:test";
import assert from "node:assert";
import { createQuietMeadowState, revealCell, toggleFlag } from "./model";

describe("Quiet Meadow Model", () => {
  it("should generate the same board with the same seed and first reveal", () => {
    const s1 = createQuietMeadowState({ width: 5, height: 5, totalMines: 3 }, "test-seed");
    revealCell(s1, 2, 2);
    
    const s2 = createQuietMeadowState({ width: 5, height: 5, totalMines: 3 }, "test-seed");
    revealCell(s2, 2, 2);
    
    assert.deepStrictEqual(s1.cells.map(c => c.isMine), s2.cells.map(c => c.isMine));
  });

  it("should generate different boards with different seeds", () => {
    const s1 = createQuietMeadowState({ width: 5, height: 5, totalMines: 3 }, "seed1");
    revealCell(s1, 2, 2);
    
    const s2 = createQuietMeadowState({ width: 5, height: 5, totalMines: 3 }, "seed2");
    revealCell(s2, 2, 2);
    
    assert.notDeepStrictEqual(s1.cells.map(c => c.isMine), s2.cells.map(c => c.isMine));
  });

  it("should protect the first reveal and its neighbors", () => {
    const s1 = createQuietMeadowState({ width: 5, height: 5, totalMines: 16 }, "test-seed");
    revealCell(s1, 2, 2);
    
    assert.strictEqual(s1.cells[2 * 5 + 2].isMine, false);
    // Neighbors (1,1) to (3,3)
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        assert.strictEqual(s1.cells[y * 5 + x].isMine, false);
      }
    }
  });

  it("should flood fill empty regions", () => {
    const s1 = createQuietMeadowState({ width: 5, height: 5, totalMines: 0 }, "test-seed");
    revealCell(s1, 2, 2);
    assert.strictEqual(s1.status, "won");
    assert.strictEqual(s1.revealedCount, 25);
  });

  it("should ignore reveal on flagged cells", () => {
    const s1 = createQuietMeadowState({ width: 5, height: 5, totalMines: 3 }, "test-seed");
    toggleFlag(s1, 2, 2);
    revealCell(s1, 2, 2);
    assert.strictEqual(s1.cells[2 * 5 + 2].isRevealed, false);
    assert.strictEqual(s1.status, "running");
  });

  it("should lose when revealing a mine", () => {
    // 21 mines in a 6x6 board = 36 cells. 
    // Protected area at (0,0) is 4 cells. 36 - 4 = 32 available for 21 mines.
    // We will just find a mine and click it.
    const s2 = createQuietMeadowState({ width: 6, height: 6, totalMines: 21 }, "test-seed");
    revealCell(s2, 0, 0); 
    
    // Find a mine that is NOT revealed (since it's a mine, it can't be revealed by flood fill).
    let mineX = -1, mineY = -1;
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        if (s2.cells[y * 6 + x].isMine) {
          mineX = x; mineY = y; break;
        }
      }
      if (mineX !== -1) break;
    }
    
    revealCell(s2, mineX, mineY);
    assert.strictEqual(s2.status, "lost");
  });

  it("should win when all non-mines are revealed", () => {
    const s1 = createQuietMeadowState({ width: 3, height: 3, totalMines: 1 }, "test-seed");
    revealCell(s1, 0, 0); 
    // Find the mine manually
    const mineIdx = s1.cells.findIndex(c => c.isMine);
    for (let i = 0; i < 9; i++) {
      if (i !== mineIdx) {
        revealCell(s1, i % 3, Math.floor(i / 3));
      }
    }
    assert.strictEqual(s1.status, "won");
  });

  it("should ignore actions after completion", () => {
    const s1 = createQuietMeadowState({ width: 5, height: 5, totalMines: 0 }, "test-seed");
    revealCell(s1, 2, 2);
    assert.strictEqual(s1.status, "won");
    const actions = s1.elapsedActions;
    toggleFlag(s1, 0, 0);
    assert.strictEqual(s1.elapsedActions, actions);
  });
});
