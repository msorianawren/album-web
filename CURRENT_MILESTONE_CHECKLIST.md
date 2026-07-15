# Current Milestone Checklist

## Milestone 0 - Baseline and Regression Freeze

- [x] Create the production-overhaul branch.
- [x] Record initial repository branch and HEAD.
- [x] Create resumable engineering state files.
- [v] Install dependencies and run baseline checks.
- [v] Add and run a standalone `typecheck` script.
- [v] Inventory routes, migrations, and R2 assumptions.
- [v] Smoke-test public and guest routes, ZIP behavior, audio, and selected media sources.
- [b] Runtime-test authenticated private, Studio, preference-save, notification, and help-reply flows (authenticated fixture/session unavailable).
- [v] Source-review assistant, help, notification, viewer, audio-default, and reduced-motion behavior.
- [v] Create `BASELINE_PRODUCTION_READINESS_REPORT.md`.
- [v] Update state, changelog, and handoff with verified results.
- [c] Commit Milestone 0 baseline (`55b022c`).

## Milestone 1 - Architecture, Data-Flow, and Threat Audit

- [v] Inventory Next.js routes, layouts, handlers, rendering, and cache directives.
- [v] Inventory Supabase clients, service-role call sites, RLS policies, functions, triggers, and indexes.
- [v] Map authentication, blocked-user, admin/founder, and return-path behavior.
- [v] Map album, access-request, grant, revoke, preview, media, upload, and download flows.
- [v] Map help, contact, notification, assistant, rate-limit, and audit flows.
- [v] Create architecture, data-flow, threat, service-role, route/API, and prioritized-issue reports.
- [v] Verify report evidence and update handoff/state/changelog.
- [c] Commit Milestone 1 audit (`3f6114e`).

## Milestone 2 - Error Semantics and Demo-Fallback Removal

- [v] Define typed failure categories, safe public messages, retryability, and request IDs.
- [v] Put sample album fixtures behind an explicit code flag that is disabled by default.
- [v] Preserve successful empty album lists and true not-found detail results.
- [v] Report database/schema/R2/processing failures structurally without exposing provider details to users.
- [v] Add focused automated tests for failure classification and fixture policy.
- [v] Verify empty, unavailable, not-found, processing, and API error behavior.
- [v] Create `ERROR_SEMANTICS_REPORT.md` and update engineering state/handoff/changelog.
- [c] Commit the verified Milestone 2 subtask (`9f0e896`).

## Milestone 3 - Supabase Client and Authorization Boundaries

- [x] Add explicit public/anon, request-scoped JWT user, trusted admin, and trusted worker client modules.
- [x] Extract runtime token reading into a server-only helper.
- [x] Add a centralized private-album role decision matrix.
- [v] Add and run client import-boundary and role-decision unit tests.
- [v] Run full checks for the scoped client-boundary foundation.
- [c] Commit the scoped client-boundary foundation (`7ae6419`).
- [v] Migrate public album and public-media reads away from the legacy service-role client.
- [v] Ensure unauthorized private album responses expose only an explicit safe preview or no cover.
- [c] Commit the verified public album read migration (`e258ede`).
- [v] Add a backward-compatible private-album RLS helper plus media/comment policies.
- [v] Add a non-destructive rollback script and policy-order/static authorization tests.
- [x] Apply `202607141830_private_album_rls.sql` remotely (reported successful by the user on 2026-07-14; independent verification pending).
- [v] Cut authenticated private reads over to JWT/RLS; production-role fixture verification is tracked separately before merge.
- [c] Commit the verified, unapplied RLS migration package (`2dda6cf`).
- [~] Migrate authenticated-user route families to request-scoped JWT/RLS clients (album list/detail/media/comments reads, ZIP, single download, notifications, and help complete; remaining families inventoried).
- [v] Migrate album create/update/delete/upload-entry/reorder mutations behind trusted admin contexts.
- [c] Commit the verified album admin route family (`610b71c`).
- [v] Migrate cron routes behind constant-time trusted worker contexts.
- [v] Fail closed for missing/invalid worker secrets in every environment.
- [c] Commit the verified cron worker boundary (`de15980`).
- [v] Migrate notification count/list/read/dismiss routes to request-scoped JWT/RLS clients.
- [c] Commit the verified notification user boundary (`098214b`).
- [v] Migrate public comment reads to anon/RLS and comment moderation item mutations to a guarded admin client.
- [c] Commit the verified comment read/moderation boundary (`a79cec9`).
- [v] Migrate Founder audit-log reads and admin user block/unblock queries to guarded trusted clients.
- [v] Add pagination bounds, strict block-state validation, UUID validation, safe errors, and no-store responses to those admin routes.
- [c] Commit the verified audit-log/user-management route boundary (`fc34389`).
- [v] Make the role-management repository require an explicit database client.
- [v] Pass guarded Founder clients from list/grant/revoke role routes.
- [c] Commit the verified Founder role-management boundary (`4b82c62`).
- [v] Migrate user help thread/message list reads to request-scoped JWT/RLS clients.
- [v] Prepare atomic authenticated RPCs and rollback for help create/append writes.
- [x] Apply `202607142115_user_help_write_rpcs.sql` remotely (reported successful by the user on 2026-07-14; independent verification pending).
- [x] Cut help thread creation and message append over to authenticated JWT/RPC calls.
- [v] Add atomicity, no-multi-step-fallback, fixed-failure-mapping, and guest-denial tests.
- [v] Complete help authorization implementation and local/static verification; production-role fixture verification is tracked separately before merge.
- [c] Commit the verified help JWT/RPC application cutover (`350a875`).
- [c] Commit the verified help-read user boundary (`27c2e32`).
- [v] Add database/RLS role tests for all supported principals (static contracts and guest runtime pass).
- [v] Create `SUPABASE_BOUNDARY_REPORT.md` and `AUTHORIZATION_ROLE_MATRIX.md`.
- [v] Add static ownership, blocked-user, closed-thread, message-cap, privilege, and rollback tests for the help RPC package.
- [c] Verify and commit the help RPC migration package (`df0d0e8`).
- [v] Move private album list/detail previews and media reads to request-scoped JWT/RLS clients.
- [v] Move private ZIP and single-media authorization reads to request-scoped JWT/RLS clients.
- [v] Verify guest private detail returns locked, zero media, and safe cover only.
- [v] Add static no-grant/selected/global/revoked/blocked and cross-user help denial coverage.
- [v] Remove broad service-role reads from album repository, media download, public About/Landing reads, and slug checks; inventory 37 transitional imports.
- [c] Commit the private JWT/RLS read checkpoint (`89b2688`).
- [v] Verify Milestone 3 implementation locally: migrations applied, lint pass, typecheck pass, tests 34/34, and production build pass.
- [c] Push the Milestone 3 checkpoint to `engineering/production-platform-overhaul` without changing or deploying `main`.
- [x] Milestone 3 status: COMPLETE - IMPLEMENTED AND LOCALLY VERIFIED.
- [v] `PRE_MERGE_AUTHORIZATION_VERIFICATION`: remote JWT/RLS/RPC role-matrix verification passed for no-grant, selected, global, revoked, blocked, and cross-user help access; all temporary fixtures were removed.

## Milestone 4 - True Private-Media Architecture

- [v] Inventory private media key and URL columns and identify publicly retrievable legacy derivatives.
- [v] Define a separate private R2 bucket and server-only asset-manifest strategy.
- [x] Implement centralized JWT/RLS private-media authorization.
- [x] Implement an authenticated same-site media gateway with video byte-range support.
- [x] Remove private object-key values and permanent R2 URLs from browser album payloads.
- [x] Route private single-download and ZIP reads through centralized authorization.
- [x] Preserve locked-album safe-preview covers.
- [x] Add an additive manifest migration and non-R2 rollback script.
- [v] Add static private-media boundary, safe-preview, migration, and rollback tests.
- [v] Add checkpointed, idempotent inventory, manifest-backfill, R2-copy, activation, and rollback commands; all mutation commands default to dry-run.
- [v] Inventory 13 private albums, 366 media rows, and 1,830 asset variants; all source objects exist and all remain publicly reachable.
- [x] Reconcile linked migration history and verify the manifest migration is applied remotely; the safe push dry-run now proposes only `202607150000`.
- [x] Backfill 1,830 manifest rows idempotently with no duplicate rows or object deletion.
- [x] Configure `R2_PRIVATE_BUCKET_NAME` and provision a non-public R2 bucket.
- [x] Copy and verify all 1,830 asset variants with bounded, resumable processing and zero failures.
- [x] Activate all verified private-bucket assets and retain authenticated gateway delivery.
- [x] Retire 1,085 unique legacy public source objects only after private size verification; zero remained reachable through public cache.
- [x] Rehearse rollback by restoring all 1,085 public sources from private copies, then re-copy, re-activate, and re-retire them.
- [x] Fix resumability so `rollback_required` rows are reverified instead of being skipped by stale local checkpoints.
- [x] Milestone 4 status: COMPLETE - PRIVATE STORAGE OPERATIONAL AND ROLLBACK VERIFIED.

## Milestone 5 - Media URL Model and Display Reliability

- [x] Add one typed `getMediaDeliveryDescriptor(media, context)` source of truth.
- [x] Separate public card, authorized private card, viewer, processed download, original download, safe preview, and placeholder sources.
- [x] Make unauthorized private delivery return only an explicit safe preview or placeholder.
- [x] Add ordered stale-derivative fallback without native broken-image states or visible raw alt errors.
- [x] Normalize spaces, parentheses, Unicode, existing encoding, signed URLs, and same-site authenticated routes.
- [x] Bypass image optimization when authenticated delivery or host restrictions require it.
- [x] Reject HTML/JSON responses in public single and ZIP media fetches and preserve correct media MIME.
- [x] Supply stable dimensions/aspect ratios to cards and the full viewer.
- [x] Migrate public album surfaces, private authorized surfaces, viewer, Studio previews, cover selection, and downloads to the shared model.
- [v] Verify 54/54 tests, lint with 0 errors, typecheck, production build, and local public/guest HTTP smoke checks.
- [x] Create `MEDIA_DELIVERY_MODEL_REPORT.md`.
- [x] Milestone 5 status: COMPLETE - IMPLEMENTED AND LOCALLY VERIFIED.

## Milestone 6 - Asynchronous Image Processing

- [x] Replace synchronous Sharp image upload paths with private staging and durable jobs.
- [x] Verify magic bytes and decoded format; cap dimensions and total pixels.
- [x] Normalize EXIF orientation and publish metadata-free derivatives.
- [x] Preserve only the safe capture date when explicitly configured.
- [x] Generate thumbnail, medium, and large WebP plus optional AVIF derivatives.
- [x] Generate BlurHash placeholders, SHA-256 content hashes, and duplicate references.
- [x] Implement uploaded/queued/processing/ready/failed/quarantined/deleting/deleted states.
- [x] Add lease recovery, deterministic keys, retry backoff, and atomic completion.
- [x] Prevent non-ready rows from public/private RLS and delivery selection.
- [x] Add dry-run-first reprocess and non-destructive orphan-cleanup commands.
- [x] Apply and verify the additive processing migration plus compatibility backfills through `202607150020`.
- [v] Verify processor and architecture tests locally.
- [c] Commit the verified Milestone 6 implementation checkpoint (`28049a7`).
- [x] Classify existing media without unpublishing 1,165 working legacy images; preserve 3 working legacy videos as `ready`.
- [x] Run real public/private/EXIF worker canaries and verify WebP derivatives, hashes, BlurHash, private manifest delivery, and duplicate detection.
- [x] Verify oversized and invalid inputs quarantine without publishing.
- [x] Verify missing-source retry reaches terminal failure after four attempts without publishing.
- [x] Reprocess the same job and verify deterministic keys/hash with no duplicate job.
- [x] Clean every canary album, media row, job, manifest row, staging object, and derivative.
- [x] Trigger bounded background processing after uploads and retain the authenticated cron worker as recovery.
- [x] Run reprocess and orphan-cleanup commands in dry-run with zero candidates after cleanup.
- [c] Commit and push the operational Milestone 6 completion and authorization gate (`d1402e2`).
- [x] Milestone 6 status: COMPLETE - MIGRATED AND END-TO-END VERIFIED.

Legend: `[ ]` not started, `[~]` in progress, `[x]` implemented, `[v]` verified, `[c]` committed, `[b]` blocked.
