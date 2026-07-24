import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FixedStepClock } from "../src/games/core/lifecycle.ts";
import {
  acquireGameRuntimeSuspension,
  getGameRuntimeSuspensionDiagnostics,
  getGameRuntimeSuspensionSnapshot,
} from "../src/games/core/runtime.ts";
import { createSeededRng } from "../src/games/core/rng.ts";
import { parseReplay, serializeReplay } from "../src/games/core/replay.ts";
import { calculateGrantedReward, validateReplayContract } from "../src/games/core/verification.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("seeded RNG produces stable sequences and isolated forks", () => {
  const first = createSeededRng("stable-seed");
  const second = createSeededRng("stable-seed");
  assert.deepEqual(
    Array.from({ length: 20 }, () => first.next()),
    Array.from({ length: 20 }, () => second.next()),
  );
  assert.notDeepEqual(
    Array.from({ length: 4 }, () => first.fork("left").next()),
    Array.from({ length: 4 }, () => second.fork("right").next()),
  );
});

test("fixed-step clock advances deterministically and bounds catch-up work", () => {
  const clock = new FixedStepClock(10, 3);
  assert.deepEqual(clock.advance(9).ticks, []);
  assert.deepEqual(clock.advance(1).ticks, [1]);
  const delayed = clock.advance(100);
  assert.deepEqual(delayed.ticks, [2, 3, 4]);
  assert.ok(delayed.droppedMs >= 70);
});

test("replay serialization is stable, ordered by tick, and rejects invalid traces", () => {
  const serialized = serializeReplay({
    formatVersion: 1,
    engineVersion: "1",
    seed: "seed",
    fixedStepMs: 16,
    actions: [
      { tick: 4, type: "release" },
      { tick: 2, type: "press", payload: { key: "left" } },
    ],
  });
  assert.deepEqual(parseReplay(serialized).actions.map((action) => action.tick), [2, 4]);
  assert.throws(() => parseReplay('{"formatVersion":2}'), /not compatible/);
  assert.throws(
    () => serializeReplay({
      formatVersion: 1,
      engineVersion: "1",
      seed: "seed",
      fixedStepMs: 16,
      actions: [{ tick: -1, type: "press" }],
    }),
    /Invalid replay tick/,
  );
});

test("verification enforces immutable engine compatibility", () => {
  const trace = {
    formatVersion: 1,
    engineVersion: "engine-1",
    seed: "seed",
    fixedStepMs: 16,
    actions: [],
  };
  assert.equal(validateReplayContract({
    trace,
    versionId: "version",
    expectedEngineVersion: "engine-2",
    replayDigest: "a".repeat(64),
    score: 100,
    durationTicks: 60,
  }).valid, false);
  assert.equal(validateReplayContract({
    trace,
    versionId: "version",
    expectedEngineVersion: "engine-1",
    replayDigest: "a".repeat(64),
    score: 100,
    durationTicks: 60,
  }).valid, true);
});

test("reward policy applies repeat reduction and daily cap", () => {
  const policy = { baseReward: 40, maximumReward: 50, repeatMultiplierBps: 2500, dailyCap: 45 };
  assert.equal(calculateGrantedReward({ policy, completionCount: 0, dailyGranted: 0 }), 40);
  assert.equal(calculateGrantedReward({ policy, completionCount: 2, dailyGranted: 0 }), 10);
  assert.equal(calculateGrantedReward({ policy, completionCount: 0, dailyGranted: 42 }), 3);
});

test("runtime suspension is reference-counted and releases idempotently", () => {
  const releaseEnvironment = acquireGameRuntimeSuspension("environment");
  const releaseCompanion = acquireGameRuntimeSuspension("companion");
  assert.equal(getGameRuntimeSuspensionSnapshot(), true);
  assert.equal(getGameRuntimeSuspensionDiagnostics().count, 2);
  releaseEnvironment();
  assert.equal(getGameRuntimeSuspensionSnapshot(), true);
  releaseEnvironment();
  assert.equal(getGameRuntimeSuspensionDiagnostics().count, 1);
  releaseCompanion();
  assert.equal(getGameRuntimeSuspensionSnapshot(), false);
});

test("catalog stays server-safe and each game has one dynamic client loader", () => {
  const catalog = read("src/games/catalog.ts");
  const loader = read("src/games/loaders.client.ts");
  const gamesPage = read("src/app/games/page.tsx");
  assert.doesNotMatch(catalog, /loaders\.client|components\/games|dynamic\(/);
  for (const slug of ["snake", "feather-merge", "memory-garden", "puzzle-atelier"]) {
    assert.match(loader, new RegExp(`"${slug}": \\(\\) => import\\(`));
  }
  assert.doesNotMatch(gamesPage, /src\/games\/engines|games\/loaders\.client/);
  assert.doesNotMatch(gamesPage, /PuzzleAtelier/);
});

test("Game Hub exposes only real published routes and canaries remain practice-only", () => {
  const catalog = read("src/games/catalog.ts");
  const hub = read("src/components/games/GameHub.tsx");
  const player = read("src/components/games/GamePlayerShell.tsx");
  const proxy = read("src/proxy.ts");
  for (const slug of ["snake", "feather-merge", "memory-garden", "puzzle-atelier"]) {
    assert.match(catalog, new RegExp(`slug: "${slug}"`));
  }
  assert.match(hub, /data-game-card=\{game\.slug\}/);
  assert.match(hub, /data-game-status=\{game\.status\}/);
  assert.match(player, /data-game-route=\{game\.slug\}/);
  assert.match(catalog, /rewardMode: "practice"/);
  assert.match(proxy, /pathname\.startsWith\("\/games"\)/);
});

test("production CSP keeps HTTPS upgrades off local HTTP browser runners", () => {
  const nextConfig = read("next.config.ts");
  assert.match(nextConfig, /siteUsesHttps/);
  assert.match(
    nextConfig,
    /\$\{siteUsesHttps \? "upgrade-insecure-requests;" : ""\}/,
  );
});

test("global visual and audio runtimes subscribe to game suspension", () => {
  for (const file of [
    "src/components/environment/PublicDepthEnvironment.tsx",
    "src/components/assistant/OrianaCompanionRuntime.tsx",
    "src/components/ui/AudioUXProvider.tsx",
  ]) {
    assert.match(read(file), /subscribeGameRuntimeSuspension/);
  }
  assert.match(read("src/games/core/runtime.ts"), /visibilitychange/);
  assert.match(read("src/games/core/runtime.ts"), /removeEventListener\("visibilitychange"/);
});

test("generic finalization is atomic, idempotent, capped, and service-role only", () => {
  const migration = read("supabase/migrations/202607251100_game_platform_phase1.sql");
  assert.match(migration, /create or replace function public\.finalize_game_session_v1/);
  assert.match(migration, /for update/);
  assert.match(migration, /if v_session\.status = 'finalized' then/);
  assert.match(migration, /return query select v_existing\.id, v_existing\.reward_granted, coalesce\(v_balance, 0\), true/);
  assert.match(migration, /v_policy\.daily_cap - coalesce\(v_daily_granted, 0\)/);
  assert.match(migration, /event_type, game_result_id, balance_after/);
  assert.match(migration, /PUBLISHED_GAME_CONTENT_IMMUTABLE/);
  assert.match(migration, /grant execute on function public\.finalize_game_session_v1[\s\S]*to service_role/);
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.finalize_game_session_v1\([^;]+\)\s+to authenticated/i,
  );
});

test("all generic game tables enable RLS and user rows are owner-scoped", () => {
  const migration = read("supabase/migrations/202607251100_game_platform_phase1.sql");
  const requiredTables = [
    "games", "game_versions", "game_difficulties", "game_assets", "game_content_items",
    "game_tutorials", "game_mascot_profiles", "game_sessions", "game_results",
    "game_user_stats", "game_achievements", "game_user_achievements",
    "game_reward_policies", "game_daily_reward_usage", "game_leaderboards",
    "game_platform_settings", "game_runtime_events", "game_migration_map",
  ];
  requiredTables.forEach((table) => assert.match(migration, new RegExp(`'${table}'`)));
  for (const table of ["game_sessions", "game_results", "game_user_stats", "game_user_achievements", "game_daily_reward_usage", "game_runtime_events"]) {
    assert.match(migration, new RegExp(`create policy "[^"]+" on public\\.${table} for select[\\s\\S]*?user_id = \\(select auth\\.uid\\(\\)\\)`));
  }
  assert.doesNotMatch(migration, /grant select on public\.game_platform_settings/);
});

test("legacy migration remains inventory-only and rollback protects reward history", () => {
  const migration = read("supabase/migrations/202607251100_game_platform_phase1.sql");
  const rollback = read("supabase/rollbacks/202607251100_game_platform_phase1_rollback.sql");
  assert.match(migration, /'puzzle-atelier'[\s\S]*'draft'/);
  assert.match(migration, /"cutover":false/);
  assert.doesNotMatch(migration, /drop table.*puzzle_/i);
  assert.match(rollback, /ROLLBACK_BLOCKED_GAME_REWARD_HISTORY_EXISTS/);
  assert.doesNotMatch(rollback, /delete from public\.wren_feather_ledger/i);
});
