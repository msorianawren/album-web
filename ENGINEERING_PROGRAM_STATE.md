# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-14 22:55:00 +07:00
- Repository branch: `engineering/production-platform-overhaul`
- Current HEAD: `4b82c62` (explicit-client Founder role management)
- Current milestone: Milestone 3 - Supabase client and authorization boundaries
- Current subtask: Commit the help JWT/RPC cutover, then move authorized private album/media reads to request JWT/RLS
- Completed milestones: Milestone 0, Milestone 1, Milestone 2
- Files changed in current milestone: prior checkpoints plus user help JWT/RPC cutover, guarded admin/comment boundaries, migration packages, reports, and engineering state files
- Migrations created: private album RLS (`202607141830`) and user help write RPCs (`202607142115`), each with an additive rollback
- Migrations applied locally: No - Supabase CLI and `psql` are unavailable in this workspace
- Migrations applied remotely: `202607141000_unified_help_chat.sql`, `202607141830_private_album_rls.sql`, and `202607142115_user_help_write_rpcs.sql` reported successful by the user; not independently role-tested from this workspace
- Commands already run: prior milestone checks; feature-branch push/hash verification; help RPC cutover lint, typecheck, 31 unit/static tests, production build, and guest create/append denial checks
- Lint result: PASS WITH WARNINGS - 0 errors, 14 unchanged existing warnings
- Typecheck result: PASS
- Test result: PASS - 31 unit/static authorization tests; guest help create/append return 401; authenticated help role fixtures remain unavailable
- Build result: PASS - Next.js 16.2.10 compiled and generated all routes after the latest scoped client-boundary changes
- Known failures: In-app browser runtime initialization failed; authenticated help and cross-user runtime flows are not claimed
- Unresolved blockers: Authenticated user/admin fixtures are unavailable; R2 bucket prefix privacy is not independently verified; destructive database and irreversible R2 changes require explicit coordination
- Exact next action: Commit the help cutover, then pass a request JWT client into private album/media reads and verify no-grant/grant/revoke/blocked behavior
- Inspect first: `src/lib/albums.ts`, album list/detail API routes, album pages, `src/lib/db/user.ts`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
