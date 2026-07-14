# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-14 18:20:00 +07:00
- Repository branch: `engineering/production-platform-overhaul`
- Current HEAD: `9f0e896` (Milestone 2 checkpoint)
- Current milestone: Milestone 3 - Supabase client and authorization boundaries
- Current subtask: Verify and commit the scoped Supabase client-boundary foundation
- Completed milestones: Milestone 0, Milestone 1, Milestone 2
- Files changed in current milestone: server auth-token helper, explicit Supabase client modules, central role matrix, boundary tests, auth client validation path, and engineering state files
- Migrations created: None
- Migrations applied locally: Not verified
- Migrations applied remotely: `202607141000_unified_help_chat.sql` reported by the user; not independently verified
- Commands already run: prior milestone checks; Milestone 3 lint, typecheck, 12 unit/boundary tests, and production build
- Lint result: PASS WITH WARNINGS - 0 errors, 14 unchanged existing warnings
- Typecheck result: PASS
- Test result: PASS - 12 unit tests, including 4 Supabase boundary/role tests
- Build result: PASS - Next.js 16.2.10 compiled and generated all 49 routes after the scoped client-boundary changes
- Known failures: In-app browser webview did not attach a test tab; visual Milestone 2 flow is not claimed
- Unresolved blockers: Authenticated user/admin fixtures are unavailable; R2 bucket prefix privacy is not independently verified; destructive database and irreversible R2 changes require explicit coordination
- Exact next action: Commit the verified client-boundary foundation, then migrate public album reads without changing private access behavior
- Inspect first: `src/lib/db/public.ts`, `src/lib/db/user.ts`, `src/lib/db/admin.ts`, `src/lib/db/worker.ts`, `src/lib/authorization/role-matrix.ts`, `tests/supabase-boundaries.test.mjs`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
