# Engineering Handoff

## Objective

Upgrade album-web into a production-grade, privacy-sensitive digital asset management and model portfolio platform without blind rewrites or loss of existing behavior.

## Current State

- Status: IN_PROGRESS
- Branch: `engineering/production-platform-overhaul`
- Baseline commit: `f82cb5eb0e78f9ea4b5aa9c34d6a20a69cfead2d`
- Current milestone: 4 - True private-media architecture
- Completed milestone: 3 - implemented and locally verified; 34/34 tests passed and the feature branch was pushed without deploying production
- Current subtask: Resolve migration-history drift and private-bucket provisioning before manifest backfill/object copy.
- Independent Milestone 5 is complete and locally verified. `src/lib/media/delivery.ts` is now the only media URL-selection policy for application surfaces; see `MEDIA_DELIVERY_MODEL_REPORT.md`.
- Live role-matrix fixture checks are tracked in `PRE_MERGE_AUTHORIZATION_VERIFICATION.md` and must pass before merge, but do not block Milestone 4 development.

## Important Constraints

- Private media protection, RLS, authentication, access revocation, help conversations, Studio content, and public URLs must be preserved.
- Public administrator identity is always `Oriana Wren`; founder identity must not reach normal users.
- Do not edit `.env` files or log secrets, signed URL query strings, session data, phone numbers, private keys, or message bodies.
- No production R2 object may be moved or deleted until inventory dry-run, copy verification, and rollback have passed.

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
- Private browser payloads use same-site gateway URLs and redact object-key values. A server-only manifest is the target source of truth; its compatibility fallback remains server-only until the additive migration is applied.
- Local inventory found 13 private albums, 366 media rows, and 1,830 valid source variants; all 1,830 are still publicly reachable. No object was copied, moved, or deleted.
- Supabase CLI is linked to the same project as the configured environment, but remote migration history records only the first five files. A normal push would replay 27 older migrations and must not be used until history is reconciled.
- Media card/viewer/download selection is centralized. UI fallback cycles through trusted candidates without showing native broken-image states, and public download fetches reject HTML/JSON responses masquerading as media.

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

1. Reconcile remote migration history without replaying old migrations, then apply `202607142330` only.
2. Configure a non-public private R2 bucket without editing tracked environment files.
3. Run `private-media:backfill-manifest -- --apply`, followed by R2 copy dry-run and bounded copy.
4. Verify every destination and block old public delivery before activation; do not delete legacy sources yet.
5. Complete the production role matrix and rollback rehearsal before marking Milestone 4 complete.
