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
- [~] Run private-album database role tests and cut authenticated private reads over to JWT/RLS (application cutover and guest privacy verification complete; authenticated role fixtures blocked).
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
- [b] Runtime-test authenticated owner, cross-user, closed-thread, blocked-user, and message-cap behavior (authenticated fixtures/browser unavailable).
- [c] Commit the verified help JWT/RPC application cutover (`350a875`).
- [c] Commit the verified help-read user boundary (`27c2e32`).
- [~] Add database/RLS role tests for all supported principals (static contracts and guest runtime pass; authenticated database fixtures blocked).
- [v] Create `SUPABASE_BOUNDARY_REPORT.md` and `AUTHORIZATION_ROLE_MATRIX.md`.
- [v] Add static ownership, blocked-user, closed-thread, message-cap, privilege, and rollback tests for the help RPC package.
- [c] Verify and commit the help RPC migration package (`df0d0e8`).
- [v] Move private album list/detail previews and media reads to request-scoped JWT/RLS clients.
- [v] Move private ZIP and single-media authorization reads to request-scoped JWT/RLS clients.
- [v] Verify guest private detail returns locked, zero media, and safe cover only.
- [v] Add static no-grant/selected/global/revoked/blocked and cross-user help denial coverage.
- [v] Remove broad service-role reads from album repository, media download, public About/Landing reads, and slug checks; inventory 37 transitional imports.
- [c] Commit the private JWT/RLS read checkpoint (`89b2688`).
- [~] Verify the complete Milestone 3 boundary migration (authenticated role fixtures remain blocked; milestone stays in progress).

Legend: `[ ]` not started, `[~]` in progress, `[x]` implemented, `[v]` verified, `[c]` committed, `[b]` blocked.
