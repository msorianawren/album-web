# Prioritized Issue Register

- Status: COMPLETE
- Milestone: 1
- Audit date: 2026-07-14
- Scope: confirmed findings and explicitly marked verification risks from tracked code, migrations, and Milestone 0 checks

Severity describes potential impact. “Confirmed” means the code behavior is directly evidenced; it does not imply a production compromise occurred.

## PO-001 - Production album failures silently become sample content

- Severity: High
- Confirmation: CONFIRMED behavior
- Exploitability: Low direct exploitability; high operational ambiguity
- Likelihood: High whenever an album query fails or the table is empty
- Business impact: Visitors can see demo/stale albums as real content; incidents and schema failures are masked; operators cannot trust empty states.
- Affected files: `src/lib/albums.ts`, `src/lib/sample-data.ts`
- Evidence: `getAlbums` calls `filterSampleAlbums` on zero rows and in a catch-all; `getAlbum` catches errors and returns matching sample detail.
- Root cause: Demo fixtures are coupled to production repository error paths.
- Proposed correction: Explicit fixture provider enabled only by a code-level development/demo flag; typed success-empty/auth/forbidden/unavailable/schema/storage errors; safe UI states and request IDs.
- Regression risk: Existing local development may rely on implicit sample content.
- Migration requirement: None.
- Rollback strategy: Revert repository/error-state commit; keep sample provider intact behind its explicit flag.
- Test requirement: Unit tests for empty vs failure; integration test that production mode never returns sample albums after database failure.

## PO-002 - Default Supabase client bypasses RLS across trust levels

- Severity: Critical
- Confirmation: CONFIRMED architectural weakness; no cross-user breach confirmed
- Exploitability: Medium; requires a route ownership/filter defect
- Likelihood: Medium due broad import surface
- Business impact: A single application-filter mistake could expose or mutate private/user/admin data despite existing RLS policies.
- Affected files: `src/lib/supabase.ts`, `src/proxy.ts`, all modules listed in `SERVICE_ROLE_USAGE_REGISTER.md`
- Evidence: exported default `supabase` uses `SUPABASE_SERVICE_ROLE_KEY`; public, user, and admin modules import it.
- Root cause: One convenient server client became the shared data-access layer.
- Proposed correction: Separate public anon, request-scoped authenticated JWT, trusted admin, and worker clients; central authorization repositories; import-boundary lint/test.
- Regression risk: High if changed broadly; RLS policies may reveal undocumented assumptions.
- Migration requirement: Potential backward-compatible RLS/index additions; no destructive schema change.
- Rollback strategy: Migrate one route family per commit; retain trusted compatibility repository until each path passes role tests.
- Test requirement: Anonymous/authenticated/blocked/revoked/admin/founder/worker RLS and API tests, including cross-user IDs.

## PO-003 - Private media lacks an independently verified object-level boundary

- Severity: Critical
- Confirmation: UNVERIFIED HIGH-RISK ASSUMPTION; private-prefix public exposure not confirmed
- Exploitability: Potentially high if object URLs/prefix are public or retained
- Likelihood: Unknown until bucket/custom-domain rules are inspected
- Business impact: Unauthorized or revoked users could access private bytes outside application authorization.
- Affected files: `src/lib/r2.ts`, `src/lib/media.ts`, `src/lib/albums.ts`, album/viewer/download components and routes
- Evidence: one bucket/client abstraction; `getPublicUrl` maps arbitrary keys through public origin; private originals differ by `private/` prefix and cache metadata only.
- Root cause: URL omission and naming convention are being used near the storage authorization boundary.
- Proposed correction: Private bucket/non-public prefix, short-lived signed GET or authenticated gateway, centralized access decision and media ownership check, no-store and no logging.
- Regression risk: High; media URLs, viewer, downloads, covers, and Studio depend on current columns.
- Migration requirement: Backward-compatible delivery columns/state plus checkpointed object copy and checksum verification.
- Rollback strategy: Dual-read during migration, retain old objects until verification/rollback window, never delete before cutover proof.
- Test requirement: Anonymous URL guessing, authorized byte delivery, revoke-new-URL denial, blocked user, HTML/API key-leak scans, signed expiry tests.

## PO-004 - Private access decisions have competing legacy sources and unclear deny precedence

- Severity: High
- Confirmation: CONFIRMED complexity; bypass not yet confirmed
- Exploitability: Medium if state combinations conflict
- Likelihood: Medium in migrated users with grants, invites, requests, and revocations
- Business impact: Revoked users may receive inconsistent cards/detail/media access; support and audit history become unreliable.
- Affected files: `src/lib/albums.ts`, `src/lib/access-request-workflow.ts`, `src/app/api/studio/access/revoke/route.ts`, access migrations
- Evidence: decision checks grants, legacy invites, then approved requests; global-revoked values are computed but not consistently used; separate card preview logic duplicates the decision.
- Root cause: Access model evolved through requests, invites, grants, and explicit revoke markers without one precedence engine.
- Proposed correction: Pure centralized access-decision function with explicit deny dominance and effective-time rules; normalize legacy records; all callers consume one result.
- Regression risk: High for currently authorized users.
- Migration requirement: Optional additive normalization/backfill migration after dry-run report.
- Rollback strategy: Keep old decision in shadow comparison mode, record mismatches, switch only after verified parity/intentional differences.
- Test requirement: Complete state matrix for selected/global active/revoked, request statuses, legacy invite, blocked, admin, and mixed email/user identity.

## PO-005 - Upload completion does not verify server-issued reservation or R2 object facts

- Severity: High
- Confirmation: CONFIRMED validation gap
- Exploitability: Low for external users today because route is admin-only; high impact under compromised admin/session or future role expansion
- Likelihood: Medium for accidental mismatch; lower for deliberate abuse
- Business impact: Orphan/misdirected objects, false size/type metadata, wrong album ownership, processing unsafe content.
- Affected files: `src/app/api/upload/presign/route.ts`, `src/app/api/upload/complete/route.ts`, `src/lib/media.ts`, `src/lib/r2.ts`
- Evidence: completion accepts `albumId`, `mediaId`, `r2Key`, size, MIME, dimensions, and duration from browser; no reservation row, HEAD, content-length, checksum, or ownership comparison.
- Root cause: Presign and completion are stateless separate calls.
- Proposed correction: Upload reservation with owner/album/key/expected size/type/expiry; HEAD and checksum/ETag where supported; strict key prefix; single-use completion transaction.
- Regression risk: Medium; current direct-upload clients need reservation token/state handling.
- Migration requirement: Add upload session/job tables and indexes.
- Rollback strategy: Feature flag reservation flow; retain old completion only for admin during short compatibility window with audit.
- Test requirement: forged key/media ID/album, expired reservation, size mismatch, missing object, replay, MIME/signature mismatch.

## PO-006 - Videos become publicly addressable before trusted processing

- Severity: High
- Confirmation: CONFIRMED architecture gap
- Exploitability: Medium through uploaded malformed/metadata-bearing content; admin-only upload reduces exposure
- Likelihood: High for every video upload because worker is absent
- Business impact: Metadata leakage, unsupported/malicious containers, broken playback, public unfinished assets, processing denial of service.
- Affected files: `src/lib/media.ts`, upload routes, media schema/settings
- Evidence: video key is under public `albums/`; `getPublicUrl` is stored immediately; status remains `pending`/`needs_review`; FFmpeg/FFprobe is a TODO.
- Root cause: Image synchronous pipeline was extended to videos without a quarantine/worker model.
- Proposed correction: Private quarantine, durable processing jobs, trusted probe/transcode/poster, bounded resources, publish transaction only on success.
- Regression risk: High for existing videos and playback URLs.
- Migration requirement: Job/state columns or tables, private input/output keys, backfill inventory.
- Rollback strategy: Keep existing published videos readable; route only new uploads through worker; per-object fallback mapping.
- Test requirement: valid/invalid codecs, malformed container, metadata stripping, retry/idempotency, failure remains unpublished, poster and dimensions verified.

## PO-007 - Album and media reads are unbounded or application-paginated

- Severity: High
- Confirmation: CONFIRMED performance behavior
- Exploitability: Medium as a resource-amplification path
- Likelihood: High as content grows
- Business impact: Slow pages, high database/serialization cost, memory pressure, unstable mobile experience, serverless timeouts.
- Affected files: `src/lib/albums.ts`, album pages/APIs, `src/lib/studio-data.ts`
- Evidence: `getAlbums` loads all matching albums; preview query loads all eligible media then keeps four; detail loads up to 250 rows and engagement rows, then sorts in application code.
- Root cause: Client-facing pagination was added without moving cursor/limit work fully into database queries.
- Proposed correction: Database cursor pagination, bounded lateral/RPC preview selection, aggregate counts, indexes matching sort/search/RLS predicates.
- Regression risk: Medium; order stability and animated preview behavior are user-visible.
- Migration requirement: Additive indexes/RPCs as needed.
- Rollback strategy: Keep old query helper behind temporary fallback; compare ordering/counts in tests.
- Test requirement: deterministic pagination without duplicates/skips, search/status sort, private thumbnail authorization, query-count/latency benchmark.

## PO-008 - Public and private cache policy is not explicitly separated

- Severity: High
- Confirmation: CONFIRMED architecture gap; no cache leak confirmed
- Exploitability: Low currently due broad no-cache, potentially high if caching is added incorrectly
- Likelihood: Medium during performance optimization
- Business impact: Either poor performance or accidental private/user response caching.
- Affected files: root/public pages, `src/lib/albums.ts`, `src/lib/site-settings.ts`, notification/help APIs, future media gateway
- Evidence: public pages are dynamic/no-cache; private/user data uses similar rendering paths; permanent media URLs are independent of access context.
- Root cause: Caching was disabled broadly instead of modeled by data classification.
- Proposed correction: Public projections with tags/revalidation; private/user/admin no-store; centralized delivery descriptor and cache headers; no public cache for signed/private responses.
- Regression risk: High if user-specific album cards are cached as public.
- Migration requirement: None required; optional public projection/RPC.
- Rollback strategy: Revert cache activation to no-store without changing data model.
- Test requirement: header tests for guest/authorized/admin, cache-key isolation, revoke visibility, CDN behavior.

## PO-009 - Rate limiting is non-atomic and process-local at the proxy tier

- Severity: Medium
- Confirmation: CONFIRMED design limitation
- Exploitability: Medium for distributed/racing clients
- Likelihood: Medium under bot traffic
- Business impact: Comment/contact/request/like/download abuse and avoidable database/compute load.
- Affected files: `src/proxy.ts`, `src/lib/security-rate-limit.ts`, `security_rate_limits` migration
- Evidence: proxy uses an in-memory `Map`; database limiter reads count then separately updates it.
- Root cause: Serverless/distributed execution was not accounted for in counter design.
- Proposed correction: Atomic SQL/RPC increment or managed edge limiter; route-specific policies and Cloudflare rules; keep application limits as defense in depth.
- Regression risk: Medium; incorrect keying can block legitimate shared networks.
- Migration requirement: Add atomic function/index/expiry cleanup if using Postgres.
- Rollback strategy: Keep existing limiter while shadowing new decisions; disable new limiter with server flag if false positives occur.
- Test requirement: parallel race test, multi-instance simulation, reset behavior, blocked user, `Retry-After`, privacy of fingerprints.

## PO-010 - Logs lack centralized redaction and correlation IDs

- Severity: Medium
- Confirmation: CONFIRMED observability gap; no credential leak observed
- Exploitability: Low direct; sensitive-data poisoning is possible through request input
- Likelihood: Medium
- Business impact: Incident diagnosis is difficult; audit storage may retain unnecessary personal/query data; support cannot correlate safe errors.
- Affected files: `src/proxy.ts`, `src/lib/audit.ts`, `src/lib/errors.ts`, routes using `console.error`
- Evidence: raw search strings and arbitrary metadata may be stored; errors have no request ID/category; logging styles vary.
- Root cause: Audit history and diagnostic logging were built independently.
- Proposed correction: Structured redacted logger, request/correlation ID, route/action/outcome/duration/category, metadata allowlists, query stripping, retention policy.
- Regression risk: Low to medium; Studio audit views may expect current fields.
- Migration requirement: Optional additive request ID/error category columns and retention index.
- Rollback strategy: Dual-write new structured fields while preserving existing columns; revert logger adapter.
- Test requirement: redaction tests for tokens/cookies/signed URLs/phone/message/private keys; correlation propagation tests.

## PO-011 - Error model conflates database, schema, storage, processing, and authorization failures

- Severity: Medium
- Confirmation: CONFIRMED behavior
- Exploitability: Low
- Likelihood: High during failures
- Business impact: Unsafe retry decisions, generic UX, hard incident triage, raw non-production errors, sample fallback masking.
- Affected files: `src/lib/errors.ts`, data repositories and API routes
- Evidence: `toServerError` maps all thrown errors to `SERVER_ERROR`; many helpers return null on any error; no correlation ID.
- Root cause: Error handling is response-oriented rather than domain/result-oriented.
- Proposed correction: Typed result/error categories with safe public copy, structured private logs, request ID, retryability, intentional UI states.
- Regression risk: Medium; callers currently treat null/empty as normal.
- Migration requirement: None.
- Rollback strategy: Adapter maps typed errors back to current API envelope during staged rollout.
- Test requirement: each error category, safe production message, no internal SQL/R2 details, retry state.

## PO-012 - Single and ZIP downloads do not share a complete private-access delivery policy

- Severity: High
- Confirmation: CONFIRMED inconsistency
- Exploitability: Low for unauthorized download because current policy is restrictive; product access is incomplete
- Likelihood: High for approved private users attempting downloads
- Business impact: Approved users may view but cannot download; future fixes risk bypass if implemented separately; ZIP relies on permanent URLs.
- Affected files: `src/app/api/media/[id]/download/route.ts`, `src/app/api/albums/[id]/download/route.ts`, `src/lib/albums.ts`
- Evidence: single download permits admin or public album only; ZIP calls `getAlbum` with only `isAdmin`, so normal approved-user session is not passed into access decision.
- Root cause: View and download authorization evolved in separate routes.
- Proposed correction: One authorization decision and delivery descriptor covering detail, viewer, single download, original download, and ZIP; media-album ownership verified server-side.
- Regression risk: High because downloads are security-sensitive.
- Migration requirement: Depends on private-media architecture; no destructive migration.
- Rollback strategy: Keep downloads denied for private users if new path fails; never fall back to public URL authorization.
- Test requirement: public allowed/disabled, selected/global approved, pending/revoked/blocked, per-media download flags, original permission, ZIP outer folder.

## PO-013 - ZIP creation is synchronous and compute-heavy

- Severity: Medium
- Confirmation: CONFIRMED performance design
- Exploitability: Medium resource amplification within rate limits
- Likelihood: Medium for large albums
- Business impact: Serverless timeout/memory/CPU cost and failed customer downloads.
- Affected files: `src/app/api/albums/[id]/download/route.ts`
- Evidence: up to 100 remote fetches and Sharp JPEG conversions occur serially inside one request before/while streaming ZIP.
- Root cause: Export has no durable job/artifact lifecycle.
- Proposed correction: Queued export job, bounded worker concurrency, progress/status, expiring private artifact, cancellation and idempotency.
- Regression risk: Medium; changes immediate download UX.
- Migration requirement: Export job table/storage prefix.
- Rollback strategy: Retain current path for small public albums while staged worker handles large/private exports.
- Test requirement: size/count/time limits, partial upstream failure, cancellation, artifact expiry, authorization at request and retrieval.

## PO-014 - CSP still depends on unsafe directives and broad external origins

- Severity: Medium
- Confirmation: CONFIRMED configuration
- Exploitability: Depends on presence of an injection bug; none confirmed here
- Likelihood: Medium long-term
- Business impact: Reduced XSS containment and larger third-party/resource trust surface.
- Affected files: `next.config.ts`, `src/app/layout.tsx`
- Evidence: `unsafe-inline`, `unsafe-eval`, Google font hosts, wildcard Supabase/R2 hosts, inline theme script.
- Root cause: Development/runtime compatibility and external fonts/assets were prioritized over strict CSP.
- Proposed correction: Self-host fonts with `next/font`, remove `unsafe-eval` where compatible, nonce/hash strategy for inline bootstrap, narrow exact hosts, document exceptions.
- Regression risk: High for hydration, scripts, images, audio, OAuth, and development behavior.
- Migration requirement: None.
- Rollback strategy: Tighten one directive/source at a time with report-only monitoring and easy config revert.
- Test requirement: production browser console, OAuth, theme bootstrap, all R2 media/audio, Studio, CSP violation collection.

## PO-015 - Locale, SEO, and accessibility contracts are incomplete

- Severity: Medium
- Confirmation: CONFIRMED gaps; full WCAG audit not yet performed
- Exploitability: Not a security exploit
- Likelihood: High for non-English and assistive-technology users
- Business impact: Incorrect language semantics, weaker discoverability, keyboard/dialog barriers, inconsistent translated text.
- Affected files: `src/app/layout.tsx`, metadata/sitemap/robots files, dictionaries/components, media viewer/dialogs
- Evidence: root `<html lang="en">` is static; public-only sitemap/privacy metadata verification is absent; keyboard features exist but focus trap/restoration/axe journeys are not verified.
- Root cause: Language and interaction preferences are client-focused rather than platform metadata contracts.
- Proposed correction: Server-resolved locale/lang, public-only metadata/sitemap, localized status/forms, dialog focus management, semantic controls, reduced-motion and contrast/touch audits.
- Regression risk: Medium; hydration and URL/locale behavior can change.
- Migration requirement: None unless translated content schema is expanded.
- Rollback strategy: Keep English fallback and progressively enable metadata/a11y changes per surface.
- Test requirement: locale fallback/lang, private metadata exclusion, keyboard-only journeys, axe, reduced motion, touch viewports.

## PO-016 - Duplicate client-side and proxy authorization helpers can drift

- Severity: Medium
- Confirmation: CONFIRMED duplication; exploit not confirmed
- Exploitability: Medium if one validator becomes weaker
- Likelihood: Medium over continued development
- Business impact: Open redirect, inconsistent blocked/session behavior, or route-specific authorization regressions.
- Affected files: `src/lib/auth-redirect.ts`, `src/lib/auth.ts`, `src/lib/admin.ts`, `src/proxy.ts`, route-level guards
- Evidence: proxy has its own `safeNextPath`, Supabase constructors, profile sync, admin ID logic, and API error shape alongside shared helpers.
- Root cause: proxy runtime concerns led to parallel implementations.
- Proposed correction: Runtime-compatible shared pure validators/types; centralized auth decision contract; avoid importing Node-only trusted modules into proxy.
- Regression risk: Medium due Edge/Node runtime differences.
- Migration requirement: None.
- Rollback strategy: Replace one pure helper at a time and retain behavior snapshots.
- Test requirement: redirect payload corpus, expired/refresh sessions, blocked/admin/founder paths, host canonicalization.

## Prioritization Order

1. PO-001 and PO-011: make failures explicit before changing architecture.
2. PO-002 and PO-004: establish trustworthy authorization/data clients.
3. PO-003 and PO-012: implement actual private-media delivery.
4. PO-005 and PO-006: verified asynchronous media pipeline.
5. PO-007 and PO-008: pagination and cache separation.
6. PO-009, PO-010, PO-013, PO-014, PO-015, PO-016: hardening, operations, and platform quality.
