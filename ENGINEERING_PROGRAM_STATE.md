# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-14 21:35:00 +07:00
- Repository branch: `engineering/production-platform-overhaul`
- Current HEAD: `df0d0e8` (transactional help-write RPC package)
- Current milestone: Milestone 3 - Supabase client and authorization boundaries
- Current subtask: Commit the verified public comment read and guarded moderation boundary
- Completed milestones: Milestone 0, Milestone 1, Milestone 2
- Files changed in current milestone: prior checkpoints plus comment read/moderation route boundaries, help-write RPC migration/rollback/static tests, boundary reports, and engineering state files
- Migrations created: private album RLS (`202607141830`) and user help write RPCs (`202607142115`), each with an additive rollback
- Migrations applied locally: No - Supabase CLI and `psql` are unavailable in this workspace
- Migrations applied remotely: `202607141000_unified_help_chat.sql` reported by the user; not independently verified
- Commands already run: prior milestone checks; help-read lint, typecheck, 22 unit/boundary tests, production build, restarted local dev server, and guest endpoint denial checks
- Lint result: PASS WITH WARNINGS - 0 errors, 14 unchanged existing warnings
- Typecheck result: PASS
- Test result: PASS - 28 unit/static authorization tests; guest help denial and comment read/moderation HTTP checks pass; authenticated fixtures remain unavailable
- Build result: PASS - Next.js 16.2.10 compiled and generated all 49 routes after the scoped client-boundary changes
- Known failures: In-app browser webview did not attach a test tab; visual Milestone 2 flow is not claimed
- Unresolved blockers: Authenticated user/admin fixtures are unavailable; R2 bucket prefix privacy is not independently verified; destructive database and irreversible R2 changes require explicit coordination
- Exact next action: Commit the comment boundary, then migrate another guarded Studio/admin route family while private/user-write schema application remains externally blocked
- Inspect first: `src/app/api/admin/audit-logs/route.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/lib/db/admin.ts`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
