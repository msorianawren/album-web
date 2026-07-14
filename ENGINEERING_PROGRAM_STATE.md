# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-14 22:20:00 +07:00
- Repository branch: `engineering/production-platform-overhaul`
- Current HEAD: `4b82c62` (explicit-client Founder role management)
- Current milestone: Milestone 3 - Supabase client and authorization boundaries
- Current subtask: Verify the remotely applied Milestone 3 migrations, then cut help writes and private reads over to JWT/RLS in isolated checkpoints
- Completed milestones: Milestone 0, Milestone 1, Milestone 2
- Files changed in current milestone: prior checkpoints plus guarded audit/user routes, comment boundaries, help-write RPC package, reports, and engineering state files
- Migrations created: private album RLS (`202607141830`) and user help write RPCs (`202607142115`), each with an additive rollback
- Migrations applied locally: No - Supabase CLI and `psql` are unavailable in this workspace
- Migrations applied remotely: `202607141000_unified_help_chat.sql`, `202607141830_private_album_rls.sql`, and `202607142115_user_help_write_rpcs.sql` reported successful by the user; not independently role-tested from this workspace
- Commands already run: prior milestone checks; help-read lint, typecheck, 22 unit/boundary tests, production build, restarted local dev server, and guest endpoint denial checks
- Lint result: PASS WITH WARNINGS - 0 errors, 14 unchanged existing warnings
- Typecheck result: PASS
- Test result: PASS - 30 unit/static authorization tests; guest help/comment/admin denial checks pass; authenticated fixtures remain unavailable
- Build result: PASS - Next.js 16.2.10 compiled and generated all routes after the latest scoped client-boundary changes
- Known failures: In-app browser webview did not attach a test tab; visual Milestone 2 flow is not claimed
- Unresolved blockers: Authenticated user/admin fixtures are unavailable; R2 bucket prefix privacy is not independently verified; destructive database and irreversible R2 changes require explicit coordination
- Exact next action: Cut user help create/append routes over to the authenticated RPCs, verify with available sessions, then cut authorized private album reads to JWT/RLS and finish Milestone 3 role tests
- Inspect first: `src/lib/help-chat.ts`, user help routes, `src/lib/albums.ts`, `src/lib/db/user.ts`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
