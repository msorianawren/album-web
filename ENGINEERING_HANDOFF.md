# Engineering Handoff

## Objective

Upgrade album-web into a production-grade, privacy-sensitive digital asset management and model portfolio platform without blind rewrites or loss of existing behavior.

## Current State

- Status: IN_PROGRESS
- Branch: `main` after merging `engineering/production-platform-overhaul`
- Baseline commit: `f82cb5eb0e78f9ea4b5aa9c34d6a20a69cfead2d`
- Current milestone: final merge gate; Milestones 0 through 6 are complete
- Completed milestone: 3 - implemented and locally verified; 34/34 tests passed and the feature branch was pushed without deploying production
- Current subtask: verify the Vercel production deployment and scheduled media-recovery configuration.
- Independent Milestone 5 is complete and locally verified. `src/lib/media/delivery.ts` is now the only media URL-selection policy for application surfaces; see `MEDIA_DELIVERY_MODEL_REPORT.md`.
- Milestone 6 private staging, durable queue, upload-triggered background worker, retry recovery, and remote canaries are complete. See `ASYNC_IMAGE_PROCESSING_REPORT.md`.
- Live role-matrix fixture checks passed against remote JWT/RLS/RPC boundaries; evidence and cleanup are recorded in `PRE_MERGE_AUTHORIZATION_VERIFICATION.md`.

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
- Help create/append call the applied RPC package; authenticated owner and cross-user denial checks pass remotely.
- Private browser payloads use same-site gateway URLs and redact object-key values. The server-only manifest is active in the non-public bucket.
- Initial inventory found 13 private albums, 366 media rows, and 1,830 variants. All 1,085 unique legacy public objects were later retired with verified copy-back rollback.
- Supabase CLI is linked to the configured project. Remote migration history is applied through `202607150020`.
- The private manifest contains 1,830 active variants in the non-public bucket. All 1,085 unique public legacy sources were reversibly retired and no public cache path remained reachable. Rollback copy-back and final re-cutover were exercised end to end.
- Media card/viewer/download selection is centralized. UI fallback cycles through trusted candidates without showing native broken-image states, and public download fetches reject HTML/JSON responses masquerading as media.
- Image jobs use deterministic versioned derivative keys, private staging, state-gated RLS, atomic completion, bounded claims, lease recovery, and retry backoff. Cleanup tooling does not delete R2 objects.

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
- Public and private media now use explicit bucket roles and authenticated private delivery.
- Image processing is asynchronous and durable; trusted video processing remains a later milestone.
- Album list/detail queries silently fall back to sample data on empty/error paths.
- Help threads reuse one system, paginate user data, cap consecutive messages, and normalize admin identity.
- Tracked migrations define 21 primary application tables, 9 SQL functions, 11 triggers, RLS policies, and indexes for album/media/access/help/notification paths; no views were found.
- Auth return paths use validated relative paths in short-lived `httpOnly` flow cookies; the proxy duplicates some redirect/session helpers.
- Presigned image completion has durable reservation, HEAD verification, queue state, and trusted processing; trusted video probing remains pending.
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

1. Commit and push the completed Milestone 4 operational checkpoint after its full gate.
2. Apply `202607142340_reconcile_album_preview_columns.sql` and `202607150000_async_image_processing.sql` to the linked project.
3. Schedule the trusted `/api/cron/process-media` worker with a bounded batch.
4. Smoke one public and one private image through ready, retry, quarantine, and delivery paths.
5. Complete the pre-merge authorization verification before merging the feature branch.
