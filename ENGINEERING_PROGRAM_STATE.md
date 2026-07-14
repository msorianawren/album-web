# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-14 23:45:00 +07:00
- Repository branch: `engineering/production-platform-overhaul`
- Current HEAD: `350a875` (help JWT/RPC application cutover; private JWT/RLS cutover pending checkpoint commit)
- Current milestone: Milestone 3 - Supabase client and authorization boundaries
- Current subtask: Verify and checkpoint the private album/media JWT/RLS cutover; authenticated role fixtures remain blocked
- Completed milestones: Milestone 0, Milestone 1, Milestone 2
- Files changed in current milestone: prior checkpoints plus help RPC cutover, private album/media/ZIP/single-download JWT reads, guarded media/content admin mutations, tests, reports, and engineering state files
- Migrations created: private album RLS (`202607141830`) and user help write RPCs (`202607142115`), each with an additive rollback
- Migrations applied locally: No - Supabase CLI and `psql` are unavailable in this workspace
- Migrations applied remotely: `202607141000_unified_help_chat.sql`, `202607141830_private_album_rls.sql`, and `202607142115_user_help_write_rpcs.sql` reported successful by the user; not independently role-tested from this workspace
- Commands already run: prior milestone checks; feature-branch push/hash verification; help RPC cutover gates; private JWT/RLS typecheck, tests, lint, and guest locked-album runtime check
- Lint result: PASS WITH WARNINGS - 0 errors, 11 existing warnings
- Typecheck result: PASS
- Test result: PASS - 34 unit/static authorization tests after the latest changes; guest private album is locked with zero media and safe cover; authenticated role fixtures remain unavailable
- Build result: PASS - Next.js 16.2.10 compiled and generated all listed routes (48 static generation units)
- Known failures: In-app browser runtime initialization remains unavailable; authenticated grant/revoke/blocked and cross-user help runtime flows are not claimed
- Unresolved blockers: Authenticated user/admin fixtures are unavailable; R2 bucket prefix privacy is not independently verified; destructive database and irreversible R2 changes require explicit coordination
- Exact next action: Run final lint/typecheck/tests/build, update reports with results, and commit the Milestone 3 checkpoint without merging or starting Milestone 4
- Inspect first: `src/lib/albums.ts`, private album/media routes, `AUTHORIZATION_ROLE_MATRIX.md`, and `SUPABASE_BOUNDARY_REPORT.md`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
