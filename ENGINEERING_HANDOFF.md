# Engineering Handoff

## Objective

Upgrade album-web into a production-grade, privacy-sensitive digital asset management and model portfolio platform without blind rewrites or loss of existing behavior.

## Current State

- Status: IN_PROGRESS
- Branch: `engineering/production-platform-overhaul`
- Baseline commit: `f82cb5eb0e78f9ea4b5aa9c34d6a20a69cfead2d`
- Current milestone: 2 - Error semantics and demo-fallback removal
- Completed checkpoint: `3f6114e docs: add architecture and threat baseline`
- Current subtask: Commit the fully verified Milestone 2 implementation.
- Production architecture has not been changed by this program yet.

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
- Private single/ZIP download authorization is not unified with approved private viewing.
- Proxy rate limits are per-instance and database action counters are non-atomic.
- Audit/error logging has no centralized correlation ID or redaction contract.

## Next Five Actions

1. Commit the verified Milestone 2 error-semantics change and record its checkpoint.
2. Begin Milestone 3 with scoped Supabase client modules and an authorization role matrix.
3. Migrate public album reads away from the default service-role client first.
4. Add JWT-bound authenticated client tests for user-owned notifications/help/access paths.
5. Migrate admin/worker callers in isolated route-family commits with import-boundary checks.
