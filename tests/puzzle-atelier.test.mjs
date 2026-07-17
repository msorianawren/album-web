import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  createPuzzleBoard,
  isSolved,
  legalSlidingPositions,
  moveSlidingTile,
  replayPuzzleTrace,
  solvedBoard,
  swapTiles,
} from "../src/lib/puzzles/engine.ts";
import { calculatePuzzleReward } from "../src/lib/puzzles/rewards.ts";
import { detectAssistantIntent } from "../src/lib/assistant/intents.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("puzzle boards are deterministic, solvable, and never start solved", () => {
  for (const mode of ["sliding", "swap"]) {
    for (const size of [3, 4, 5]) {
      const first = createPuzzleBoard(`challenge:seed:${mode}:${size}`, mode, size);
      const second = createPuzzleBoard(`challenge:seed:${mode}:${size}`, mode, size);
      assert.deepEqual(first, second);
      assert.equal(isSolved(first), false);
      assert.equal(first.length, size * size);
      assert.equal(first.filter((tile) => tile === null).length, 1);
      assert.equal(new Set(first).size, first.length);
    }
  }
});

test("sliding and swap moves enforce their legal board rules", () => {
  const solved = solvedBoard(3);
  assert.equal(isSolved(solved), true);
  const legal = legalSlidingPositions(solved, 3);
  assert.equal(legal.length, 2);
  assert.equal(moveSlidingTile(solved, 3, 1), null);
  assert.ok(moveSlidingTile(solved, 3, 6));
  assert.equal(swapTiles(solved, 0, 0), null);
  assert.deepEqual(swapTiles(solved, 0, 1)?.slice(0, 2), [2, 1]);
  assert.equal(replayPuzzleTrace({ seed: "verified", mode: "sliding", size: 3, trace: [{ tile: 99 }] }).valid, false);
});

test("server replay verifies a complete swap trace from the deterministic board", () => {
  const seed = "challenge:verified:swap:3";
  let board = createPuzzleBoard(seed, "swap", 3);
  const trace = [];
  for (let position = 0; position < board.length; position += 1) {
    const expected = position === board.length - 1 ? null : position + 1;
    const source = board.indexOf(expected);
    if (source === position) continue;
    trace.push({ from: position, to: source });
    board = swapTiles(board, position, source);
  }
  assert.equal(isSolved(board), true);
  assert.equal(replayPuzzleTrace({ seed, mode: "swap", size: 3, trace }).valid, true);
});

test("Wren Feather reward calculation is bounded and includes target bonuses", () => {
  const targets = { "3": { seconds: 180, moves: 40 } };
  assert.equal(calculatePuzzleReward({ gridSize: 3, mode: "sliding", multiplier: 1, elapsedMs: 180_000, moveCount: 40, targets }), 14);
  assert.equal(calculatePuzzleReward({ gridSize: 5, mode: "sliding", multiplier: 2, elapsedMs: 1, moveCount: 1, targets: { "5": { seconds: 10, moves: 1 } } }), 100);
  assert.equal(calculatePuzzleReward({ gridSize: 3, mode: "swap", multiplier: 0.5, elapsedMs: 999_999, moveCount: 999, targets: {} }), 5);
});

test("Companion recognizes game guidance without conflating it with private access", () => {
  assert.equal(detectAssistantIntent("How does the sliding puzzle work?").intent, "games_sliding");
  assert.equal(detectAssistantIntent("Show valid moves, I am stuck").intent, "games_help");
  assert.equal(detectAssistantIntent("How do I earn Wren Feathers from a puzzle?").intent, "games_rewards");
});

test("puzzle migration keeps rewards atomic and direct account tables closed", () => {
  const migration = read("supabase/migrations/202607170900_puzzle_atelier.sql");
  assert.match(migration, /create table if not exists public\.puzzle_challenges/i);
  assert.match(migration, /create table if not exists public\.puzzle_attempts/i);
  assert.match(migration, /create or replace function public\.finalize_puzzle_attempt/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /if attempt\.finalized_at is not null then/i);
  assert.match(migration, /earned := greatest\(0, next_reward - coalesce\(previous\.best_reward, 0\)\)/i);
  assert.match(migration, /reward_earned = earned/i);
  assert.match(migration, /revoke all on table public\.puzzle_attempts, public\.puzzle_user_results, public\.puzzle_user_profiles, public\.puzzle_user_badges from anon, authenticated/i);
  assert.match(migration, /status = 'published' and visibility = 'public'/i);
  assert.match(migration, /primary key \(user_id, badge_key\)/i);
});

test("games dictionaries and guest storage stay localized and versioned", () => {
  const english = JSON.parse(read("src/dictionaries/en.json"));
  const vietnamese = JSON.parse(read("src/dictionaries/vi.json"));
  const atelier = read("src/components/games/PuzzleAtelier.tsx");
  for (const key of ["title", "sliding", "swap", "timer", "estimatedReward", "personalBest", "completed", "unavailable"]) {
    assert.equal(typeof english.games[key], "string");
    assert.equal(typeof vietnamese.games[key], "string");
  }
  assert.match(atelier, /oriana\.puzzle\.best\.v1/);
  assert.match(atelier, /localStorage/);
  assert.match(atelier, /motion-reduce:transition-none/);
});

test("puzzle APIs enforce server-side access and Studio only exposes public album images", () => {
  const startRoute = read("src/app/api/games/attempts/route.ts");
  const completeRoute = read("src/app/api/games/attempts/[id]/complete/route.ts");
  const studioRoute = read("src/app/api/studio/games/route.ts");
  assert.match(startRoute, /session\.isBlocked/);
  assert.match(completeRoute, /parsed\.data\.attemptId !== id/);
  assert.match(studioRoute, /\.eq\("albums\.status", "public"\)/);
  assert.match(studioRoute, /Only ready public album images may be used for a puzzle/);
});
