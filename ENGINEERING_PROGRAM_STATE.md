# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-14
- Repository branch: `engineering/production-platform-overhaul`
- Latest implementation checkpoint: `89b2688 refactor(authz): enforce private reads with user RLS`
- Current milestone: Milestone 4 - True private-media architecture
- Current subtask: Verify the authenticated gateway and additive private-asset manifest before any R2 copy or activation
- Completed milestones: Milestone 0, Milestone 1, Milestone 2, Milestone 3 (implemented and locally verified)
- Files changed in current milestone: private media authorization/projection, authenticated streaming gateway, private download/ZIP delivery, manifest migration/rollback, tests, architecture report, and engineering state files
- Migrations created: prior authorization migrations plus additive private media manifest (`202607142330`) with rollback
- Migrations applied locally: No - Supabase CLI and `psql` are unavailable in this workspace
- Migrations applied remotely: `202607141000_unified_help_chat.sql`, `202607141830_private_album_rls.sql`, and `202607142115_user_help_write_rpcs.sql` reported successful by the user; not independently role-tested from this workspace
- Commands already run: prior milestone checks; feature-branch push/hash verification; help RPC cutover gates; private JWT/RLS typecheck, tests, lint, and guest locked-album runtime check
- Lint result: PASS WITH WARNINGS - 0 errors, 11 existing warnings
- Typecheck result: PASS
- Test result: PASS - 40/40 after the initial Milestone 4 private-media checkpoint
- Build result: PASS - Next.js 16.2.10 compiled and generated all routes, including the authenticated private-media gateway (48 static generation units)
- Known failures: Legacy private derivatives remain publicly retrievable by permanent URL until copied to a non-public bucket and activated
- Unresolved blockers: None for Milestone 4 development; live role-matrix fixtures remain a tracked pre-merge gate
- Exact next action: Run full local checks, apply the additive manifest in a controlled environment, then execute inventory dry-run without moving or deleting R2 objects
- Inspect first: `PRIVATE_MEDIA_ARCHITECTURE_REPORT.md`, `src/lib/private-media.ts`, and `src/app/api/media/[id]/content/route.ts`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
