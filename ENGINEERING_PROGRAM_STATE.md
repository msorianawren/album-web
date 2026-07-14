# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-14 19:00:00 +07:00
- Repository branch: `engineering/production-platform-overhaul`
- Current HEAD: `e258ede` (public album reads through RLS)
- Current milestone: Milestone 3 - Supabase client and authorization boundaries
- Current subtask: Commit the backward-compatible private album RLS migration package
- Completed milestones: Milestone 0, Milestone 1, Milestone 2
- Files changed in current milestone: client/public-read checkpoints plus private-album RLS migration, rollback, static authorization tests, and engineering state files
- Migrations created: `supabase/migrations/202607141830_private_album_rls.sql` with `supabase/rollbacks/202607141830_private_album_rls_rollback.sql`
- Migrations applied locally: No - Supabase CLI and `psql` are unavailable in this workspace
- Migrations applied remotely: `202607141000_unified_help_chat.sql` reported by the user; not independently verified
- Commands already run: prior milestone checks; RLS package lint, typecheck, 17 unit/static migration tests, and production build
- Lint result: PASS WITH WARNINGS - 0 errors, 14 unchanged existing warnings
- Typecheck result: PASS
- Test result: PASS - 17 unit/static authorization tests; live database role tests are BLOCKED_EXTERNAL until migration application
- Build result: PASS - Next.js 16.2.10 compiled and generated all 49 routes after the scoped client-boundary changes
- Known failures: In-app browser webview did not attach a test tab; visual Milestone 2 flow is not claimed
- Unresolved blockers: Authenticated user/admin fixtures are unavailable; R2 bucket prefix privacy is not independently verified; destructive database and irreversible R2 changes require explicit coordination
- Exact next action: Commit the RLS migration package without enabling JWT private reads; continue with an independently guarded admin route family while remote migration application remains blocked
- Inspect first: `supabase/migrations/202607141830_private_album_rls.sql`, `supabase/rollbacks/202607141830_private_album_rls_rollback.sql`, `tests/supabase-private-rls.test.mjs`, `src/lib/db/admin.ts`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
