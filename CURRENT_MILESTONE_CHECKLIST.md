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
- [ ] Commit Milestone 1 audit.

Legend: `[ ]` not started, `[~]` in progress, `[x]` implemented, `[v]` verified, `[c]` committed, `[b]` blocked.
