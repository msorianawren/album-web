import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createSnakeState,
  queueSnakeDirection,
  stepSnake,
} from "../src/games/engines/snake/model.ts";
import {
  createFeatherMergeState,
  moveFeatherMerge,
} from "../src/games/engines/feather-merge/model.ts";
import {
  createMemoryGardenState,
  revealMemoryCard,
  stepMemoryGarden,
} from "../src/games/engines/memory-garden/model.ts";

test("Snake food and movement replay deterministically", () => {
  const first = createSnakeState("canary");
  const second = createSnakeState("canary");
  for (const direction of ["down", "left", "up", "right"]) {
    queueSnakeDirection(first, direction);
    queueSnakeDirection(second, direction);
    stepSnake(first);
    stepSnake(second);
  }
  assert.deepEqual(first, second);
});

test("Feather Merge produces a deterministic spawn sequence", () => {
  const first = createFeatherMergeState("canary");
  const second = createFeatherMergeState("canary");
  for (const direction of ["left", "down", "right", "up"]) {
    moveFeatherMerge(first, direction);
    moveFeatherMerge(second, direction);
  }
  assert.deepEqual(first, second);
});

test("Memory Garden creates deterministic pairs and resolves mismatches by tick", () => {
  const first = createMemoryGardenState("canary");
  const second = createMemoryGardenState("canary");
  assert.deepEqual(first.cards, second.cards);
  const mismatch = first.cards.findIndex((card) => card.pair !== first.cards[0].pair);
  assert.equal(revealMemoryCard(first, 0, 1), true);
  assert.equal(revealMemoryCard(first, mismatch, 2), true);
  const releaseTick = first.mismatchUntilTick;
  assert.ok(releaseTick);
  assert.equal(stepMemoryGarden(first, releaseTick - 1), false);
  assert.equal(stepMemoryGarden(first, releaseTick), true);
  assert.deepEqual(first.selected, []);
});

test("canary migration publishes versions without enabling reward policies", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/202607252000_game_hub_canaries.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /"registered":false,"mode":"practice-only"/);
  assert.doesNotMatch(migration, /insert into public\.game_reward_policies/);
});

test("every canary caps low-quality rendering at 30 FPS", () => {
  for (const relativePath of [
    "../src/games/engines/snake/SnakeGame.tsx",
    "../src/games/engines/feather-merge/FeatherMergeGame.tsx",
    "../src/games/engines/memory-garden/MemoryGardenGame.tsx",
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.match(source, /targetRenderFps: quality === "low" \? 30 : 60/);
  }
});
