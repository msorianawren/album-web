# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-14 21:05:00 +07:00
- Repository branch: `engineering/production-platform-overhaul`
- Current HEAD: `27c2e32` (help-read JWT/RLS boundary)
- Current milestone: Milestone 3 - Supabase client and authorization boundaries
- Current subtask: Record the boundary/role reports, then prepare narrow transactional help-write RPCs without enabling the cutover
- Completed milestones: Milestone 0, Milestone 1, Milestone 2
- Files changed in current milestone: prior checkpoints plus `SUPABASE_BOUNDARY_REPORT.md`, `AUTHORIZATION_ROLE_MATRIX.md`, and engineering state files
- Migrations created: `supabase/migrations/202607141830_private_album_rls.sql` with `supabase/rollbacks/202607141830_private_album_rls_rollback.sql`
- Migrations applied locally: No - Supabase CLI and `psql` are unavailable in this workspace
- Migrations applied remotely: `202607141000_unified_help_chat.sql` reported by the user; not independently verified
- Commands already run: prior milestone checks; help-read lint, typecheck, 22 unit/boundary tests, production build, restarted local dev server, and guest endpoint denial checks
- Lint result: PASS WITH WARNINGS - 0 errors, 14 unchanged existing warnings
- Typecheck result: PASS
- Test result: PASS - 22 unit/static authorization tests plus guest help list/detail/create/append denial checks; authenticated help fixture remains unavailable
- Build result: PASS - Next.js 16.2.10 compiled and generated all 49 routes after the scoped client-boundary changes
- Known failures: In-app browser webview did not attach a test tab; visual Milestone 2 flow is not claimed
- Unresolved blockers: Authenticated user/admin fixtures are unavailable; R2 bucket prefix privacy is not independently verified; destructive database and irreversible R2 changes require explicit coordination
- Exact next action: Verify and commit the Milestone 3 reports, then add narrow help create/append RPC and rollback migrations while keeping the current application write path unchanged until remote application and role tests succeed
- Inspect first: `SUPABASE_BOUNDARY_REPORT.md`, `AUTHORIZATION_ROLE_MATRIX.md`, `src/lib/help-chat.ts`, `supabase/migrations/202607141000_unified_help_chat.sql`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
