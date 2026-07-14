# Engineering Changelog

## 2026-07-14 - Milestone 4 private-media foundation

- Closed Milestone 3 as implemented and locally verified; moved live role fixtures to the required pre-merge authorization checklist.
- Added centralized private media authorization, browser-safe projections, and an authenticated streaming gateway with byte-range support.
- Removed private object-key values and permanent R2 URLs from album payloads and routed private single/ZIP downloads through the same boundary.
- Added an additive server-only asset manifest migration, rollback, architecture inventory, and focused tests.
- No production R2 object was moved or deleted, and production was not deployed.

## 2026-07-14 16:54:59 +07:00 - Program initialization

- Milestone: 0
- Files: `ENGINEERING_PROGRAM_STATE.md`, `ENGINEERING_CHANGELOG.md`, `ENGINEERING_HANDOFF.md`, `CURRENT_MILESTONE_CHECKLIST.md`
- Reason: Make the multi-session production overhaul resumable and auditable.
- Behavior before: Essential execution state existed only in task context.
- Behavior after: Branch, milestone, checks, blockers, and next actions are recorded in the repository.
- Security impact: Reduces the chance of unsafe assumptions during authorization or storage migrations.
- Performance impact: None.
- Test performed: Git branch and clean-worktree baseline inspection.

## 2026-07-14 17:07:57 +07:00 - Milestone 0 baseline

- Milestone: 0
- Files: `package.json`, `BASELINE_PRODUCTION_READINESS_REPORT.md`, engineering state files
- Reason: Freeze production behavior and validation results before architecture changes.
- Behavior before: No standalone typecheck command or consolidated production-readiness baseline existed.
- Behavior after: `npm run typecheck` is available and baseline route, ZIP, audio, privacy, build, lint, TypeScript, migration, Supabase, and R2 assumptions are recorded.
- Security impact: Records confirmed sample fallback/service-role/CSP risks and verifies private ZIP denial without changing authorization.
- Performance impact: None at runtime.
- Test performed: `npm install`, lint, typecheck, production build, local and production HTTP smoke tests, ZIP structure inspection, audio asset checks, SSR media checks, targeted source review.

## 2026-07-14 - Milestone 0 checkpoint

- Milestone: 0
- Commit: `55b022c docs: establish production readiness baseline`
- Result: COMPLETE - implemented, verified, and committed.

## 2026-07-14 17:25:29 +07:00 - Milestone 1 architecture and threat baseline

- Milestone: 1
- Files: `ARCHITECTURE_AUDIT.md`, `DATA_FLOW_MAP.md`, `THREAT_MODEL.md`, `SERVICE_ROLE_USAGE_REGISTER.md`, `ROUTE_AND_API_REGISTER.md`, `PRIORITIZED_ISSUE_REGISTER.md`, engineering state files
- Reason: Establish an evidence-based route, data-flow, trust-boundary, storage, RLS, and issue baseline before changing authorization or private-media architecture.
- Behavior before: Architecture and security findings were distributed across source and conversation context.
- Behavior after: All route families, Supabase constructors/service-role uses, migration objects, auth/access/media/help flows, trust boundaries, confirmed findings, assumptions, rollback needs, and test requirements are recorded.
- Security impact: Documentation only; distinguishes confirmed weaknesses from unverified R2/private-prefix risks and defines the least-privilege migration target.
- Performance impact: Documentation only; records unbounded query, cache, ZIP, and processing bottlenecks.
- Test performed: Targeted tracked-file inventories, `git diff --check`, lint (0 errors, 14 unchanged warnings), TypeScript pass, and production build pass (49 routes generated).

## 2026-07-14 - Milestone 1 checkpoint

- Milestone: 1
- Commit: `3f6114e docs: add architecture and threat baseline`
- Result: COMPLETE - implemented, verified, and committed.

## 2026-07-14 - Milestone 2 error semantics and fixture isolation

- Milestone: 2
- Files: `src/lib/app-failure.ts`, `src/lib/demo-fixtures.ts`, `src/lib/errors.ts`, `src/lib/albums.ts`, `src/lib/r2.ts`, `src/lib/media.ts`, album/search APIs, error boundaries, media cards/grid, tests, package scripts, `ERROR_SEMANTICS_REPORT.md`, engineering state files
- Reason: Stop backend failures from presenting demo albums and make error categories observable without exposing provider details.
- Behavior before: Empty/error album queries could return sample data; R2, processing, schema, and unexpected failures collapsed into generic behavior; pending/failed media could reach the viewer.
- Behavior after: Demo fixtures require explicit code opt-in; empty/not-found remain real states; typed failures include safe request IDs; R2/processing are distinct; unavailable media has intentional UI and is excluded from the viewer.
- Security impact: Removes fake success states, prevents raw provider details in structured logs/API responses, and reduces blank/unsafe media exposure.
- Performance impact: Negligible request-ID/classification overhead; sample data is no longer statically imported by the album repository.
- Test performed: 8 unit tests, lint (0 errors, 14 unchanged warnings), TypeScript pass, production build pass, local album/API 200/404 checks, and zero sample IDs in live list response.

## 2026-07-14 - Milestone 2 checkpoint

- Milestone: 2
- Commit: `9f0e896 fix(albums): remove production demo fallbacks`
- Result: COMPLETE - implemented, verified, and committed.

## 2026-07-14 18:20:00 +07:00 - Milestone 3 scoped client foundation

- Milestone: 3
- Files: `src/lib/auth-token.ts`, `src/lib/db/*`, `src/lib/authorization/role-matrix.ts`, `src/lib/auth.ts`, `tests/supabase-boundaries.test.mjs`, engineering state files
- Reason: Make public, user-JWT, admin, and worker trust levels explicit before migrating route families away from the broad service-role client.
- Behavior before: One generic service-role export was the default database client and auth token parsing lived inside the session module.
- Behavior after: New code has separate anon, request-JWT, guarded admin, and constant-time-authorized worker constructors; a pure role matrix covers private-album principals and entitlement states.
- Security impact: Public/user clients cannot read the service-role key; new trusted clients require explicit server-only modules and guard contexts. Existing broad imports remain until isolated migration.
- Performance impact: No route query behavior changed; clients remain request-scoped where identity is required.
- Test performed: Lint pass with 14 unchanged warnings, TypeScript pass, 12 unit tests including static client-boundary and role-decision cases, and production build pass with 49 routes.

## 2026-07-14 - Milestone 3 scoped client checkpoint

- Milestone: 3
- Commit: `7ae6419 refactor(auth): establish scoped Supabase clients`
- Result: COMPLETE - bounded foundation implemented, verified, and committed; route-family migration continues.

## 2026-07-14 18:40:00 +07:00 - Milestone 3 public album read boundary

- Milestone: 3
- Files: `src/lib/albums.ts`, `tests/supabase-boundaries.test.mjs`, engineering state files
- Reason: Stop anonymous public album and media reads from using the broad service-role client while preserving authorized private album behavior.
- Behavior before: Album list/detail rows, all previews, public media, and engagement counts used service role.
- Behavior after: Album rows and public/updating previews/media use the anon client; only authorized private media remains on the transitional trusted path. Unauthorized private covers resolve only to the explicit safe preview or null.
- Security impact: Normal anonymous reads no longer bypass RLS, and an unauthorized private detail no longer returns its original cover URL.
- Performance impact: Query count is unchanged for anonymous requests; authenticated mixed lists may issue separate bounded public/private preview queries.
- Test performed: Lint pass with 14 unchanged warnings, TypeScript pass, 13 unit tests, production build pass with 49 routes, and runtime checks for 50 albums, 13 locked private cards, private zero-media detail, safe cover behavior, and a 23-media public detail.

## 2026-07-14 - Milestone 3 public read checkpoint

- Milestone: 3
- Commit: `e258ede refactor(albums): route public reads through RLS`
- Result: COMPLETE - bounded public-read migration implemented, verified, and committed.

## 2026-07-14 19:00:00 +07:00 - Milestone 3 private album RLS package

- Milestone: 3
- Files: `supabase/migrations/202607141830_private_album_rls.sql`, `supabase/rollbacks/202607141830_private_album_rls_rollback.sql`, `tests/supabase-private-rls.test.mjs`, engineering state files
- Reason: Prepare the database boundary required before authenticated private album media can move from service role to a request-scoped JWT client.
- Behavior before: RLS allowed users to read own grants/requests but had no policy that translated approved access into private media/comment reads.
- Behavior after: An additive security-definer boolean decision centralizes blocked/admin/grant/revoke/invite/request precedence and two authenticated select policies delegate to it; rollback removes only these additions.
- Security impact: Anonymous execution is revoked; blocked and explicit revoked states are evaluated before legacy or approved-request fallbacks. Application cutover is intentionally deferred until remote application and role tests.
- Performance impact: Existing grant/request/invite indexes support the predicates; no runtime query changes occur until deployment.
- Test performed: 17 unit/static authorization tests, lint pass with 14 unchanged warnings, TypeScript pass, and production build pass with 49 routes. SQL execution is BLOCKED_EXTERNAL because no local Supabase CLI/`psql` or remote migration permission is available.

## 2026-07-14 - Milestone 3 RLS package checkpoint

- Milestone: 3
- Commit: `2dda6cf security(db): add private album RLS decision`
- Result: COMPLETE - migration, rollback, and static verification committed; remote application remains BLOCKED_EXTERNAL.

## 2026-07-14 19:20:00 +07:00 - Milestone 3 album admin mutation boundary

- Milestone: 3
- Files: album create/detail/images/reorder API routes, `tests/supabase-boundaries.test.mjs`, engineering state files
- Reason: Couple privileged album mutations to a role guard and trusted client obtained from one server-only boundary.
- Behavior before: Routes called `requireAdmin` separately and imported the generic service-role client directly; several database failures returned raw provider messages.
- Behavior after: Create, update, delete, upload storage accounting, and reorder obtain one guarded admin database context; touched 5xx database failures use safe classified responses with request IDs.
- Security impact: A service client is not constructed until a non-blocked admin session is validated, broad client imports are removed from the route family, and raw Supabase failure text is no longer returned on these paths.
- Performance impact: No query-count change; guard/session work is equivalent to the previous route-level check.
- Test performed: Lint pass with 14 unchanged warnings, TypeScript pass, 18 unit/boundary tests, production build pass with 49 routes, and anonymous POST/PATCH/DELETE/upload/reorder denial checks (four `403`, Studio proxy `401`). Authenticated admin mutation testing is BLOCKED_EXTERNAL by missing fixture.

## 2026-07-14 - Milestone 3 album admin checkpoint

- Milestone: 3
- Commit: `610b71c refactor(admin): guard album mutations with trusted client`
- Result: COMPLETE - bounded admin route family implemented, verified, and committed.

## 2026-07-14 19:40:00 +07:00 - Milestone 3 cron worker boundary

- Milestone: 3
- Files: `src/lib/authorization/worker-secret.ts`, `src/lib/db/worker.ts`, both cron routes, `tests/supabase-boundaries.test.mjs`, engineering state files
- Reason: Ensure scheduled maintenance/system mutations cannot obtain service-role access before exact worker authentication.
- Behavior before: Cron secrets used normal string comparison only in production; local/preview requests bypassed the check and routes imported the broad client directly.
- Behavior after: Exact bearer validation uses constant-time comparison and fails closed in every environment; direct cron queries use a purpose-labelled trusted worker client and safe classified errors.
- Security impact: Missing configuration no longer creates a permissive environment, invalid secrets are rejected before settings/database reads, and raw Supabase errors are not returned from the touched paths.
- Performance impact: Constant-time secret comparison is negligible; database query behavior is unchanged after authorization.
- Test performed: Lint pass with 14 unchanged warnings, TypeScript pass, 20 unit/boundary tests, production build pass with 49 routes, and local missing/invalid-secret HTTP checks returning `401` for both routes. Valid-secret execution is BLOCKED_EXTERNAL to avoid reading/logging secret material.

## 2026-07-14 - Milestone 3 cron worker checkpoint

- Milestone: 3
- Commit: `de15980 security(cron): require trusted worker context`
- Result: COMPLETE - bounded worker route family implemented, verified, and committed.

## 2026-07-14 20:00:00 +07:00 - Milestone 3 notification user boundary

- Milestone: 3
- Files: both notification API routes, `tests/supabase-boundaries.test.mjs`, engineering state files
- Reason: Enforce notification ownership through the caller's verified JWT and database RLS instead of a service-role query plus application filter.
- Behavior before: Count/list/read/dismiss used the broad client and relied only on `.eq(recipient_user_id, session.userId)` in application code.
- Behavior after: Each route requires a request-derived JWT client; the same ownership filters remain defense in depth, notification IDs are UUID-validated, and failures use safe classified responses.
- Security impact: Cross-user notification access is constrained by RLS even if a future application filter regresses; user IDs are never accepted from the browser as authority and user data remains `no-store`.
- Performance impact: Query shapes and limits remain unchanged; the client is request-scoped.
- Test performed: Lint pass with 14 unchanged warnings, TypeScript pass, 21 unit/boundary tests, production build pass with 49 routes, and guest count/list/mark-all/single-update checks returning `401`. Authenticated fixture testing is BLOCKED_EXTERNAL.

## 2026-07-14 - Milestone 3 notification checkpoint

- Milestone: 3
- Commit: `098214b refactor(notifications): enforce user RLS client`
- Result: COMPLETE - bounded user route family implemented, verified, and committed.

## 2026-07-14 20:20:00 +07:00 - Milestone 3 help-read user boundary

- Milestone: 3
- Files: user help API routes, `src/lib/help-chat.ts`, `tests/supabase-boundaries.test.mjs`, engineering state files
- Reason: Let RLS enforce thread/message ownership for user conversation reads without replacing the existing help system.
- Behavior before: User list/detail reads used the broad service-role client and application `.eq(owner_user_id, session.userId)` filters.
- Behavior after: Routes create a request-scoped JWT client and pass it into the existing list/detail functions; pagination and public `Oriana Wren` admin identity normalization remain unchanged. Thread IDs are UUID-validated.
- Security impact: Cross-user read isolation now has an RLS boundary in addition to application filters. Create/append remain explicitly transitional because current policies cannot safely preserve internal-note and atomic thread-update behavior.
- Performance impact: Existing page size and query count are unchanged.
- Test performed: Lint pass with 14 unchanged warnings, TypeScript pass, 22 unit/boundary tests, production build pass with 49 routes, and guest list/detail/create/append checks returning `401`. Authenticated help fixture remains BLOCKED_EXTERNAL.

## 2026-07-14 - Milestone 3 help-read checkpoint

- Milestone: 3
- Commit: `27c2e32 refactor(help): enforce RLS on user reads`
- Result: COMPLETE - bounded user read path implemented, verified, and committed; help writes remain transitional.

## 2026-07-14 21:05:00 +07:00 - Milestone 3 boundary and role reports

- Milestone: 3
- Files: `SUPABASE_BOUNDARY_REPORT.md`, `AUTHORIZATION_ROLE_MATRIX.md`, engineering state files
- Reason: Record the implemented trust-specific clients, private-access precedence, migrated route families, remaining broad-client surface, external blockers, and required database role tests before further authorization changes.
- Behavior before: Boundary decisions and remaining service-role migration work were distributed across checkpoint notes and source.
- Behavior after: The client boundary, role matrix, 47-file transitional register, migration order, rollback constraints, and production verification limits are explicit and resumable.
- Security impact: Documentation only; prevents an unsafe private-media or help-write cutover before additive migrations and role tests are complete.
- Performance impact: None.
- Test performed: Targeted report/source consistency review; repository checks are recorded at the report checkpoint commit.

## 2026-07-14 - Milestone 3 boundary report checkpoint

- Milestone: 3
- Commit: `ca4da1c docs(auth): record Supabase boundary migration status`
- Result: COMPLETE - reports verified and committed; Milestone 3 remains in progress.

## 2026-07-14 21:20:00 +07:00 - Milestone 3 transactional user help-write package

- Milestone: 3
- Files: `supabase/migrations/202607142115_user_help_write_rpcs.sql`, matching rollback and static tests, boundary reports, engineering state files
- Reason: Replace the eventual help user-write service-role bypass with narrow, atomic database operations without granting broad thread update rights.
- Behavior before: Thread creation could leave a partial thread if message insertion failed; append inserted and then updated thread state separately; app service role performed both paths.
- Behavior after: Prepared RPCs derive identity from `auth.uid()`, reject blocked/cross-owner/closed/capped writes, serialize append decisions with a row lock, and keep related rows atomic. Application behavior is deliberately unchanged until the migration is applied and role-tested.
- Security impact: The prepared boundary removes caller-controlled identity and anonymous execution. No production authorization claim is made before database role verification.
- Performance impact: One transactional RPC will replace multiple network round trips after cutover; row locking is limited to the target thread during append.
- Test performed: 27 unit/static tests, lint with no errors and 14 unchanged warnings, TypeScript pass; SQL execution remains BLOCKED_EXTERNAL.

## 2026-07-14 - Milestone 3 help-write RPC checkpoint

- Milestone: 3
- Commit: `df0d0e8 security(help): add atomic user write RPCs`
- Result: COMPLETE - additive migration package verified and committed; remote application and application cutover remain blocked.

## 2026-07-14 21:35:00 +07:00 - Milestone 3 comment read and moderation boundary

- Milestone: 3
- Files: `src/app/api/comments/route.ts`, `src/app/api/comments/[id]/route.ts`, boundary tests, reports, engineering state files
- Reason: Stop public comment reads and admin comment moderation from sharing an eagerly constructed broad service-role path.
- Behavior before: Public comment GET and guarded admin moderation used the module-wide service client; item IDs were not UUID-validated and raw provider messages could reach some 500 responses.
- Behavior after: Public comment GET uses anon/RLS, authenticated admin reads/mutations use a guarded trusted client, item IDs are UUID-validated, and migrated data failures use safe classification. User comment creation remains unchanged pending a purpose-built write boundary.
- Security impact: Public reads no longer bypass RLS and the item moderation route cannot construct a trusted client before the admin guard succeeds.
- Performance impact: Query shape and limits are unchanged.
- Test performed: 28 unit/static tests, lint with no errors and 14 unchanged warnings, TypeScript pass, production build pass with 49 routes, public GET `200`, and guest PATCH/DELETE `403`.

## 2026-07-14 - Milestone 3 comment boundary checkpoint

- Milestone: 3
- Commit: `a79cec9 refactor(comments): enforce public and admin boundaries`
- Result: COMPLETE - public comment reads and item moderation database operations use scoped boundaries; user creation remains transitional.

## 2026-07-14 21:50:00 +07:00 - Milestone 3 Founder audit and user management routes

- Milestone: 3
- Files: Founder audit-log route, admin user detail route, boundary tests, reports, engineering state files
- Reason: Ensure sensitive audit/profile queries obtain a trusted client only through explicit Founder/admin guards and fix permissive request coercion.
- Behavior before: Both routes imported the broad client; audit page size was unbounded; `Boolean(body.is_blocked)` interpreted the string `"false"` as blocked; raw provider messages could reach user-management errors.
- Behavior after: Routes use guarded trusted clients, audit pages are clamped to 100, user IDs and block payloads are strictly validated, user responses are no-store, and migrated failures are safely classified. Shared auth bootstrap and append-only audit/notification helpers remain transitional.
- Security impact: Reduces direct broad-client surface, protects Founder status with the trusted row, prevents malformed block-state coercion, and keeps sensitive responses out of public caches.
- Performance impact: Audit requests are capped at 100 rows; user update query count remains bounded.
- Test performed: 29 unit/static tests, lint with no errors and 14 unchanged warnings, TypeScript pass, production build pass, and guest audit/user mutation requests denied with `401` by the proxy.

## 2026-07-14 - Milestone 3 audit/user route checkpoint

- Commit: `fc34389 refactor(admin): guard audit and user management queries`
- Result: COMPLETE - sensitive route queries use guarded clients and strict input handling.

## 2026-07-14 22:05:00 +07:00 - Milestone 3 Founder role-management boundary

- Milestone: 3
- Files: role-management repository, Founder user list/grant/revoke routes, transitional Studio call sites, boundary tests, state files
- Reason: Remove the repository's implicit broad client and make every caller declare its database trust source.
- Behavior before: Role-management functions silently used the module-wide service client regardless of caller guard context.
- Behavior after: All role queries and mutations require an explicit client; Founder API routes pass guarded clients, while legacy Studio callers are visibly transitional at their call sites.
- Security impact: Removes one broad-client import and makes accidental unguarded role-management use a compile-time error.
- Performance impact: Query shapes are unchanged; Founder grant/revoke currently revalidate the trusted context before mutation.
- Test performed: 30 unit/static tests, lint with no errors and 14 unchanged warnings, TypeScript pass, and production build pass.

## 2026-07-14 22:20:00 +07:00 - Milestone 3 remote migration status

- Milestone: 3
- Files: engineering state, checklist, handoff, and Supabase boundary report
- Reason: Record the user's confirmation that the latest private-album RLS and help-write RPC migrations were run successfully in Supabase.
- Behavior before: Both migrations were recorded as unapplied external blockers.
- Behavior after: Schema application is user-reported complete; database role verification and application cutover remain in progress.
- Security impact: No runtime change in this checkpoint; prevents treating unverified role behavior as production-guaranteed.
- Performance impact: None.
- Test performed: Repository migration inventory and current commit/state consistency review; remote database execution was not independently observed.

## 2026-07-14 22:55:00 +07:00 - Milestone 3 help JWT/RPC cutover

- Milestone: 3
- Files: user help routes, `src/lib/help-chat.ts`, authorization/RPC tests, reports, engineering state files
- Reason: Use the remotely applied atomic RPCs instead of multi-statement service-role writes.
- Behavior before: User create/append helpers inserted and updated help rows separately through the broad service client.
- Behavior after: Routes require a request JWT client and each user write calls one authenticated RPC; identity comes from `auth.uid()`, and public failure responses are fixed by provider code rather than raw messages.
- Security impact: Cross-user ownership and blocked/status/cap checks move to the database boundary; user write code no longer accepts caller identity or bypasses RLS.
- Performance impact: Each user write reduces multiple database round trips to one RPC, excluding best-effort notification/audit side effects.
- Test performed: 31 unit/static tests, lint with no errors and 14 unchanged warnings, TypeScript pass, production build pass, and guest create/append `401`; authenticated role tests remain blocked.

## 2026-07-14 23:45:00 +07:00 - Milestone 3 private JWT/RLS read cutover

- Milestone: 3 (remains IN_PROGRESS)
- Files: album repository/pages/routes, private media/ZIP/single-download routes, guarded media/content mutations, boundary tests, authorization reports, and engineering state files
- Reason: Make the remotely applied RLS helper the final boundary for private album/media reads and remove inappropriate broad service-role reads.
- Behavior before: Private previews/detail media and single downloads used the broad service client after application-only checks; revoke/block could disagree with UI state, and album slug checks were callable by guests through a faulty session guard.
- Behavior after: Private reads use the request JWT and `can_access_private_album`; grant/request/invite summaries are read through own-row RLS in three batched queries; selected/global revoke precedence matches SQL; private comments, ZIP checks, and individual media reads share the JWT boundary; media mutations and slug checks require guarded admin clients.
- Security impact: Block/revoke now fail closed at query time, unauthorized responses return no media and only a safe cover, and public About/Landing reads use anon RLS. Transitional broad imports decreased from 43 to 37 and remain explicitly inventoried.
- Performance impact: Album cards use three bounded, batched entitlement queries rather than per-album access queries; public and private preview fetches remain batched.
- Test performed: lint pass with 0 errors and 11 existing warnings; TypeScript pass; 34/34 tests pass; production build pass; guest runtime private detail is locked with zero media and safe cover. Authenticated no-grant/selected/global/revoked/blocked and cross-user runtime tests remain blocked by unavailable fixtures/browser, so Milestone 3 is not complete.
