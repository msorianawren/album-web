# Game Platform Phase 1

Status: foundation only. Puzzle Atelier remains the production `/games` experience.

## Boundaries

- `src/games/catalog.ts` is server-safe metadata. It must never import a client loader, component, or engine.
- `src/games/loaders.client.ts` owns one dynamic import per game.
- `src/games/core` contains framework-light contracts for deterministic engines, fixed-step scheduling, replay, verification, guest scores, quality, audio, and runtime suspension.
- No generic engine is shipped in Phase 1. Puzzle Atelier remains on its existing tables and APIs.
- Guests never create a server game session. They may keep versioned best scores locally.

## Deterministic runtime

Rewarded state is derived from the server seed, immutable game version, fixed simulation ticks, and normalized input transitions. Engines may not use `Math.random()` or wall-clock time to determine a rewarded result.

The runtime uses `requestAnimationFrame` only as a scheduler. `FixedStepClock` converts elapsed presentation time into deterministic ticks and caps catch-up work. Replays contain tick-indexed input transitions rather than rendered frames.

Published `game_versions` are immutable. A verifier must load the exact version and difficulty used by the session. Unsupported engine versions fail closed.

## Runtime suspension

`acquireGameRuntimeSuspension(reason)` returns an idempotent release function. Suspensions are reference-counted, so overlapping games or overlays cannot restore global effects early.

While suspended:

- the public WebGL environment, weather particles, birds, wind impulses, and chimes are not mounted;
- ambient and global click audio stop;
- the global companion dock and panel are hidden.

Releasing the final reference restores the user's prior configured behavior. This mechanism does not change environment or assistant preferences.

## Database and RLS

Migration:

- forward: `supabase/migrations/202607251100_game_platform_phase1.sql`
- rollback: `supabase/rollbacks/202607251100_game_platform_phase1_rollback.sql`

Every game table has RLS enabled. Anonymous and authenticated users receive read-only access to published public catalog rows. Authenticated users can read only their own sessions, results, stats, achievements, daily usage, and runtime events. There are no browser write grants. Studio mutations must continue through trusted server authorization and audit logging. `service_role` is never exposed to a client bundle.

`game_platform_settings.private_config` has no public table grant. Public settings should be projected by a future trusted API rather than exposing the mixed row.

## Session finalization contract

`finalize_game_session_v1` is service-role only and operates atomically:

1. lock the owned session;
2. return the existing result for an already-finalized session;
3. verify status, expiry, nonce hash, immutable published version, replay digest, and trusted verifier result;
4. lock the active reward policy and daily usage;
5. calculate the reward from server policy, repeat reduction, and daily cap;
6. create exactly one result;
7. update the existing Feather balance;
8. create one `game_reward` ledger entry when the grant is positive;
9. update stats, usage, session status, and audit log.

The browser never submits a reward amount. A duplicate finalization returns the original result and cannot duplicate Feathers.

## Generic API contracts

`StartGameSessionRequest` identifies only a game slug, version, and difficulty. A trusted server returns a session ID, random seed, plaintext nonce (stored only by the caller), expiry, immutable version, and difficulty. The database stores only the nonce SHA-256 hash.

`FinalizeGameSessionRequest` contains the session ID, nonce, and versioned replay. A trusted version-specific verifier creates `GameVerificationResult`; only the server calls the finalization RPC.

## Legacy inventory and rollback

Run a read-only count and checksum inventory:

```text
npm run games:inventory-legacy
```

Create an exclusive local backup before any later cutover:

```text
npm run games:inventory-legacy -- --backup=artifacts/game-migration-backups/puzzle-ateliers.json
```

Backups are gitignored and created with restrictive file permissions. The Phase 1 migration maps legacy tables but does not copy, update, or delete their rows. The rollback refuses to run after a generic `game_reward` ledger row exists and never deletes Feather history.

## Query-plan checklist

No speculative performance indexes are added in Phase 1. Before a production cutover, capture `EXPLAIN (ANALYZE, BUFFERS)` with representative volume for:

- published catalog by status and slug;
- version and difficulty resolution;
- owned active session lookup;
- duplicate result lookup by session;
- prior completion count by user/game/difficulty;
- daily reward usage lock;
- user result and stat history;
- public leaderboard filtering and ordering.

Add an index only when a measured plan shows a harmful sequential scan or sort. Re-run plans after each index and check for duplicate coverage.

## Security and performance gates

`npm run perf:games` verifies:

- `/games` does not statically import generic engines or loaders;
- the server catalog has no client/component imports;
- every catalog entry has its own dynamic loader;
- generic game source imports no Three.js;
- generic game source contains no private R2 URLs, signatures, or server credentials;
- future engine source and files under `public/games` stay within recorded budgets.

The standard private-media leak gate remains authoritative for generated artifacts. Phase 1 adds no private media path, API route, dependency, global client provider, worker, or game asset.

## Acceptance and deferred work

Phase 1 is complete only after lint, typecheck, unit tests, production build, and performance gates pass. Database migration application, live RLS exercises, legacy backup, engine implementation, Studio replacement, and `/games` cutover are later pull requests.
