# Engineering Handoff

## Objective

Upgrade album-web into a production-grade, privacy-sensitive digital asset management and model portfolio platform without blind rewrites or loss of existing behavior.

## Current State

- Status: IN_PROGRESS
- Branch: `engineering/production-platform-overhaul`
- Baseline commit: `f82cb5eb0e78f9ea4b5aa9c34d6a20a69cfead2d`
- Current milestone: 3 - Supabase client and authorization boundaries
- Completed checkpoint: `89b2688 refactor(authz): enforce private reads with user RLS`
- Current subtask: Final verification and checkpoint for private album/media JWT/RLS reads.
- Public rows use anon/RLS; authorized private previews, detail media, ZIP checks, single downloads, and private comments use request JWT/RLS. Authenticated role fixtures remain unavailable.

## Important Constraints

- Private media protection, RLS, authentication, access revocation, help conversations, Studio content, and public URLs must be preserved.
- Public administrator identity is always `Oriana Wren`; founder identity must not reach normal users.
- Do not edit `.env` files or log secrets, signed URL query strings, session data, phone numbers, private keys, or message bodies.
- Destructive database migrations, irreversible R2 moves, and non-rollbackable authorization changes require external coordination.

## Decisions

- Use gated milestones and isolated commits.
- Establish the baseline before architecture changes.
- Treat production as the behavioral reference and repository/migrations as technical sources of truth.
- Prefer backward-compatible schema and dual-read/dual-write cutovers where migration is required.
- Demo fixtures are controlled by an explicit code policy and are disabled by default in every environment.
- Error logs use codes/operation/request ID/provider code only; raw causes are not serialized.
- Public and authenticated clients use the anon key; service-role construction is isolated to trusted admin/worker modules for new code.
- Existing broad-client imports remain a documented transition path until each route family has been migrated and tested.
- Authenticated private-media JWT reads now rely on the remotely applied `202607141830_private_album_rls.sql`; rollback requires reverting application cutover before removing the additive policy/function.
- Help create/append cannot be naively switched: Companion handoff writes an internal system note and append must atomically update thread state while enforcing the 10-message cap. Use a narrow RPC migration rather than broad user update rights.
- Help create/append now call the applied RPC package; static/guest checks pass and authenticated role verification remains explicitly blocked.

## Rejected Approaches

- No blind rewrite or parallel help-conversation system.
- No production sample-data fallback after backend errors.
- No permanent public URL as authorization for private media.

## Resume Commands

```powershell
git status
git branch --show-current
git log -10 --oneline
git diff --stat
```

Then read `AGENTS.md`, `ENGINEERING_PROGRAM_STATE.md`, this file, `CURRENT_MILESTONE_CHECKLIST.md`, and `ENGINEERING_CHANGELOG.md` in that order.

## Architecture Discovered

- Next.js 16 App Router with 22 page files and 60 API route files.
- A broad service-role Supabase client is the default server client.
- Public and private-prefix R2 objects currently share one client/bucket abstraction.
- Public image processing is synchronous; video processing is pending without a trusted worker.
- Album list/detail queries silently fall back to sample data on empty/error paths.
- Help threads reuse one system, paginate user data, cap consecutive messages, and normalize admin identity.
- Tracked migrations define 21 primary application tables, 9 SQL functions, 11 triggers, RLS policies, and indexes for album/media/access/help/notification paths; no views were found.
- Auth return paths use validated relative paths in short-lived `httpOnly` flow cookies; the proxy duplicates some redirect/session helpers.
- Presigned upload completion has no durable reservation, HEAD, checksum, or trusted video probe.
- Notifications use an unread count query and latest-20 list with no-store behavior.

## Known Production Risks

- Public accessibility of the `private/` R2 prefix is not independently verified.
- Service-role usage and RLS coverage are not yet fully classified or role-tested.
- Production silently falls back to sample albums on empty/error paths.
- Raw video URLs are created before trusted FFmpeg/FFprobe processing.
- Authenticated and visual interaction baselines need fixtures/stable browser automation.
- Private single/ZIP download record reads now share JWT/RLS authorization with private viewing; private user download policy remains intentionally disabled by existing product settings.
- Proxy rate limits are per-instance and database action counters are non-atomic.
- Audit/error logging has no centralized correlation ID or redaction contract.

## Next Five Actions

1. Obtain isolated authenticated fixtures for no-grant, selected, global, revoked, blocked, and cross-user help runtime tests.
2. Execute and record those role tests against the applied migrations.
3. Migrate the remaining Studio/user route families listed in `SUPABASE_BOUNDARY_REPORT.md` behind explicit clients.
4. Complete Milestone 3 acceptance only after those authenticated role tests pass.
5. Do not begin Milestone 4 until Milestone 3 is verified complete.
