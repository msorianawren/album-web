# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-14 21:20:00 +07:00
- Repository branch: `engineering/production-platform-overhaul`
- Current HEAD: `ca4da1c` (Supabase boundary migration report)
- Current milestone: Milestone 3 - Supabase client and authorization boundaries
- Current subtask: Verify and commit the unapplied transactional help-write RPC migration package
- Completed milestones: Milestone 0, Milestone 1, Milestone 2
- Files changed in current milestone: prior checkpoints plus help-write RPC migration/rollback/static tests, boundary reports, and engineering state files
- Migrations created: private album RLS (`202607141830`) and user help write RPCs (`202607142115`), each with an additive rollback
- Migrations applied locally: No - Supabase CLI and `psql` are unavailable in this workspace
- Migrations applied remotely: `202607141000_unified_help_chat.sql` reported by the user; not independently verified
- Commands already run: prior milestone checks; help-read lint, typecheck, 22 unit/boundary tests, production build, restarted local dev server, and guest endpoint denial checks
- Lint result: PASS WITH WARNINGS - 0 errors, 14 unchanged existing warnings
- Typecheck result: PASS
- Test result: PASS - 27 unit/static authorization tests plus guest help list/detail/create/append denial checks; authenticated help fixture remains unavailable
- Build result: PASS - Next.js 16.2.10 compiled and generated all 49 routes after the scoped client-boundary changes
- Known failures: In-app browser webview did not attach a test tab; visual Milestone 2 flow is not claimed
- Unresolved blockers: Authenticated user/admin fixtures are unavailable; R2 bucket prefix privacy is not independently verified; destructive database and irreversible R2 changes require explicit coordination
- Exact next action: Commit the help RPC package, then migrate a low-risk authenticated route family while the private RLS/help RPC application remains externally blocked
- Inspect first: `supabase/migrations/202607142115_user_help_write_rpcs.sql`, `tests/supabase-help-rpc.test.mjs`, `src/app/api/profile/assistant-preferences/route.ts`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
