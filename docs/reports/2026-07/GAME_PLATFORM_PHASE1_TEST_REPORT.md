# Game Platform Phase 1 Test Report

Branch: `feat/game-studio-2`

Scope:

- server-safe catalog and isolated client loader;
- deterministic RNG, fixed-step lifecycle, replay and verification contracts;
- reference-counted global runtime suspension;
- forward and guarded rollback migrations;
- atomic generic finalization contract;
- legacy Puzzle Atelier inventory tooling;
- RLS, import-boundary, secret-leak, and source-budget checks.

Verification results are recorded after the final gate:

| Gate | Result |
| --- | --- |
| `git diff --check` | Pass |
| `npm run lint` | Pass, 0 errors; 31 pre-existing warnings outside this scope |
| `npm run typecheck` | Pass |
| `npm run test` | Pass, 125/125 |
| `npm run build` | Pass, 56 static pages generated |
| `npm run perf:gate` | Pass; home 416 KiB, albums 424 KiB |

Production behavior:

- `/games` UI and Puzzle Atelier APIs are unchanged.
- Existing puzzle tables and Feather history are unchanged.
- No migration has been applied by this branch.
- No generic engine or Studio replacement is included.

Limitations:

- Supabase CLI and PostgreSQL client are not installed in the workspace, so migration execution and live RLS role exercises remain pre-merge deployment checks.
- Phase 1 tests migration/RLS contracts statically and verifies application boundaries locally.
