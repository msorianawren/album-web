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
- [b] Apply and role-test `202607141830_private_album_rls.sql` against Supabase (no local CLI/database or remote management permission).
- [c] Commit the verified, unapplied RLS migration package (`2dda6cf`).
- [ ] Migrate authenticated-user route families to request-scoped JWT/RLS clients.
- [v] Migrate album create/update/delete/upload-entry/reorder mutations behind trusted admin contexts.
- [~] Commit the verified album admin route family.
- [ ] Migrate cron routes behind trusted worker contexts.
- [ ] Add database/RLS role tests for all supported principals.
- [ ] Create `SUPABASE_BOUNDARY_REPORT.md` and `AUTHORIZATION_ROLE_MATRIX.md`.
- [ ] Verify and commit the complete Milestone 3 boundary migration.

Legend: `[ ]` not started, `[~]` in progress, `[x]` implemented, `[v]` verified, `[c]` committed, `[b]` blocked.
