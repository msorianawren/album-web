# Threat Model

- Status: COMPLETE
- Milestone: 1
- Audit date: 2026-07-14
- Method: asset/trust-boundary review with STRIDE-style threat enumeration

## Scope and Security Objectives

Protect:

- private album metadata and media bytes;
- Google-authenticated sessions and return paths;
- user profiles, block state, access requests, grants, revocations, and history;
- notifications, contact/help messages, and administrator identity;
- R2 credentials, service-role credentials, private keys, object identifiers, and signed URLs;
- Studio mutations, destructive actions, audit integrity, and production availability.

Required guarantees include owner-only conversations, no public founder identity, server-side private access checks, immediate prevention of new access after revoke, and no public caching of user/private/admin data.

## Actors

- anonymous visitor;
- authenticated normal user;
- blocked user with a previously valid session;
- user with pending, denied, revoked, selected, or global private access;
- administrator;
- founder;
- trusted worker/system process (planned, not currently distinct);
- external bot/spammer;
- attacker with a leaked permanent object URL;
- compromised browser session;
- accidental operator error.

## Assets and Classification

| Asset | Classification | Primary controls |
|---|---|---|
| Public album metadata/derivatives | Public | status filtering, CDN/cache policy |
| Locked private album safe preview | Explicitly public only if selected | server projection, dedicated safe asset |
| Private album title/detail/media | Private | auth, blocked check, access decision, private delivery |
| Originals | Private by default | private storage, admin/user policy, signed/gateway delivery |
| Session access/refresh tokens | Secret | `httpOnly`, secure cookies, token verification |
| Supabase service role | Critical secret | server-only module and least privilege |
| R2 credentials | Critical secret | server-only SDK and deployment secret store |
| Access requests/grants/history | Sensitive | ownership/admin authorization, RLS, audit |
| Help/contact message bodies | Sensitive | owner/admin authorization, internal-note filtering |
| Founder/admin identity | Private to normal users | public serializer `Oriana Wren` |
| Audit logs/IP/user-agent | Restricted admin | founder/admin guard, retention/redaction |

## Entry Points

- all public pages and search;
- OAuth start, callback, session bridge, logout;
- album list/detail, comments, likes, view events, access requests;
- single media and ZIP downloads;
- contact and help-thread APIs;
- notifications and profile preferences;
- Studio pages, settings, users, grants, requests, messages, media, uploads;
- direct presigned R2 PUT;
- cron endpoints;
- public R2/CDN object URLs;
- shortcode redirect route.

## Threats and Current Assessment

### T-01: Permanent URL bypass of private authorization

- Category: information disclosure / broken access control
- Status: UNVERIFIED HIGH-RISK ASSUMPTION, not a confirmed production exposure
- Evidence: one `getPublicUrl(key)` helper maps arbitrary keys through one public origin; image derivatives use permanent public URLs; optional originals use only a `private/` prefix in the same abstraction.
- Attack: guess, retain, share, or recover a permanent object URL after access is absent or revoked.
- Current mitigation: locked album responses omit media; private originals use a separate prefix and no-store object metadata.
- Gap: omission from HTML does not revoke or authenticate object bytes. Prefix privacy is not independently verified.
- Target control: private bucket/non-public prefix, short-lived signed GET or authenticated gateway, ownership check, no-store, no query-string logging, revocation test.

### T-02: RLS bypass through broad service-role use

- Category: elevation of privilege / information disclosure
- Status: CONFIRMED architectural weakness; no specific cross-user exploit confirmed
- Evidence: default `supabase` export is service role and is imported by public, user, and admin modules.
- Attack: a route-level ownership/filtering defect becomes direct cross-user access because database RLS is bypassed.
- Current mitigation: application `requireUser`/`requireAdmin` guards and explicit owner filters in many routes.
- Gap: defense in depth is absent for ordinary reads/mutations.
- Target control: anon public client, JWT-bound user client, explicit admin/worker clients, role matrix, RLS tests.

### T-03: Cross-user help or notification access

- Category: IDOR / information disclosure
- Status: mitigated in reviewed application paths; automated tests missing
- Evidence: help user queries filter `owner_user_id`; internal notes are excluded; notification reads/updates filter `recipient_user_id`; RLS policies mirror ownership.
- Attack: change thread/notification ID to read or modify another user's data.
- Current mitigation: owner filters plus RLS definitions.
- Residual risk: service-role calls mean an omitted filter would bypass RLS; no integration security test currently proves all variants.
- Target control: JWT-bound user client and IDOR tests.

### T-04: Founder/admin identity disclosure

- Category: privacy disclosure
- Status: mitigated in unified help helper; legacy/parallel response paths require regression testing
- Evidence: admin messages force `public_sender_name = Oriana Wren`, null public avatar, and public projection excludes sender user ID/email.
- Attack: inspect API response, notification metadata, migrated legacy reply, or UI serialization for admin identity.
- Current mitigation: `asPublicMessage`, migration normalization, neutral user notification body.
- Target control: response-contract tests across help/contact/notifications and a single public serializer.

### T-05: Upload completion forgery and object confusion

- Category: tampering / resource abuse
- Status: CONFIRMED validation gap
- Evidence: completion accepts browser-supplied `r2Key`, size, MIME, dimensions, and duration; no server-side upload reservation or HEAD/checksum verification exists.
- Attack: complete another key, misreport object size/type, or create a database row pointing at an unexpected object.
- Current mitigation: admin-only presign/completion and deterministic-looking key convention.
- Gap: the server does not prove the completion belongs to a reservation it issued.
- Target control: upload reservation row, strict prefix/album/media ownership, HEAD, content length, ETag/checksum where supported, signature/probe verification.

### T-06: Untrusted video publication

- Category: malicious file / information disclosure / availability
- Status: CONFIRMED architecture gap
- Evidence: videos receive a permanent public URL before FFprobe/FFmpeg processing; metadata/status are pending and browser-supplied dimensions/duration may be stored.
- Attack: malformed container, metadata leakage, codec bomb, unsupported content, or premature public availability.
- Current mitigation: initial MIME/extension/signature checks on multipart path and `needs_review` state.
- Gap: direct completion does not fetch/probe bytes, and storage URL is already public.
- Target control: private quarantine, trusted probe/transcode worker, poster/metadata generation, publish only after successful job.

### T-07: OAuth return-path manipulation

- Category: spoofing / open redirect
- Status: mitigated in reviewed auth flow
- Evidence: `safeAuthNext` requires a single-leading-slash relative path and rejects auth-loop paths; flow cookies are `httpOnly`, short-lived, `SameSite=Lax`.
- Residual risk: proxy has a separate simpler `safeNextPath`; duplicated validators can drift.
- Target control: one shared same-site-relative validator and integration tests for encoded/backslash/protocol-relative payloads.

### T-08: CSRF on mutation routes

- Category: request forgery
- Status: partially mitigated
- Evidence: proxy rejects cross-origin unsafe `/api` requests when an Origin header is present; cookies use `SameSite=Lax`.
- Gap: absence of Origin is accepted, server actions and non-API mutation surfaces need explicit review, and host/origin behavior depends on proxy coverage.
- Target control: shared mutation guard validating Origin/Host or CSRF token where needed, route inventory tests.

### T-09: Rate-limit races and distributed bypass

- Category: denial of service / abuse
- Status: CONFIRMED design limitation
- Evidence: proxy uses process-local `Map`; database action limiter performs read-then-update rather than an atomic increment.
- Attack: distribute requests across server instances or race concurrent updates.
- Current mitigation: Cloudflare/Vercel platform controls, proxy coarse limits, database action counters.
- Target control: atomic SQL function or managed distributed limiter, route-specific policy, `Retry-After`, abuse tests.

### T-10: Sensitive data in logs

- Category: information disclosure / repudiation
- Status: CONFIRMED logging-hardening gap; no secret leak observed in sampled logs
- Evidence: proxy audit stores raw query string; audit rows store email, IP, user-agent, and arbitrary metadata; some routes use direct `console.error`.
- Attack: place secrets/private identifiers/message data in query or error metadata, then expose through Studio logs or retention systems.
- Current mitigation: application generally avoids logging tokens and signed URLs; audit access is founder/admin controlled.
- Target control: structured logger, correlation ID, key allowlist/redaction, strip URL query, retention rules, no message body/private key/signed query/token/cookie.

### T-11: Silent demo fallback masking outages or authorization defects

- Category: integrity / availability / monitoring evasion
- Status: CONFIRMED behavior
- Evidence: album list returns sample data on empty database results and caught errors; detail catches failures and may return a sample album.
- Impact: operators and users cannot distinguish empty, unavailable, schema mismatch, or authorization failure; stale/demo content can be presented as real.
- Target control: explicit development fixture mode, structured error categories, request ID, empty/unavailable states, tests.

### T-12: PostgREST filter construction

- Category: injection-like filter manipulation / query integrity
- Status: partially mitigated; no SQL injection confirmed
- Evidence: album search interpolates `query.q` into `.or()` without the sanitizer used in help search; help search removes PostgREST control characters.
- Current mitigation: PostgREST parameterization and API schema validation/length limits where present.
- Target control: centralized PostgREST filter escaping or full-text/RPC query with bound parameters; adversarial tests for commas/parentheses/percent encoding.

### T-13: ZIP and media-proxy resource exhaustion

- Category: denial of service
- Status: bounded but still request-heavy
- Evidence: ZIP caps 100 images and 150 MiB estimated source, then fetches and Sharp-converts each image in the request; upstream length may be absent.
- Current mitigation: action rate limit, source count/size limits, streaming final ZIP.
- Gap: CPU/memory/time remain tied to a web request and remote source behavior.
- Target control: queued export job, exact accounting, timeout/abort, concurrency cap, temporary private artifact with expiry.

### T-14: Block/revoke inconsistency across legacy access paths

- Category: broken access control
- Status: plausible risk requiring tests; not confirmed as exploitable
- Evidence: access decision checks grants, legacy invites, then approved requests. A revoke marker can coexist with legacy invites or approved requests; code returns on album revoke before invite, but global-revoked handling is computed and not applied consistently.
- Target control: one precedence-tested access decision, explicit deny dominance, normalize legacy grants, RLS/server tests for every role/state.

### T-15: Public/private cache confusion

- Category: information disclosure
- Status: no confirmed cache leak; architecture not explicit
- Evidence: dynamic/no-store is broadly used, while permanent media URLs and public derivatives are shared; no centralized delivery/cache descriptor exists.
- Target control: public cache tags only for public projections, private no-store responses, vary/authorization isolation, CDN tests.

### T-16: Cron endpoint forgery

- Category: elevation of privilege / tampering
- Status: requires targeted verification
- Evidence: cron routes are public-path-adjacent API endpoints and use route-specific secret/authorization logic rather than interactive admin session. Full deployment-secret behavior was not runtime tested.
- Target control: constant-time secret validation or platform cron identity, POST where practical, no secret in query/log, tests for missing/invalid credential.

## Abuse Cases

1. Anonymous caller enumerates album/media IDs and requests private bytes.
2. Revoked user reuses a previously copied permanent media URL.
3. Authenticated user changes thread, notification, grant, or request ID.
4. Browser submits a completion for an R2 key it did not reserve.
5. Bot races comment/like/contact/request endpoints across serverless instances.
6. Malformed video consumes worker/web resources or leaks metadata.
7. Attacker places sensitive data in URL/query to poison audit logs.
8. Admin accidentally deletes DB rows and R2 objects without recoverable soft-delete/checkpoint.
9. Database outage displays sample content and delays incident detection.

## Security Controls Already Worth Preserving

- server-only modules for Supabase/R2 credentials;
- anon token verification with Supabase Auth;
- secure production session cookies and refresh behavior;
- same-site relative return-path validation;
- blocked-user checks in session guards and proxy;
- route-level admin/founder guards;
- Zod validation on access requests and many mutations;
- file signature validation on server multipart uploads;
- owner-filtered notifications/help and internal-note exclusion;
- public admin identity normalization;
- no-store notification/help/private download responses;
- security headers, frame denial, HSTS, MIME sniffing denial;
- audit/history records for access and administrative actions.

## Verification Required Before Security Claims

- real R2 private-prefix access test without credentials;
- role-based RLS tests against a local/isolated Supabase instance;
- anonymous/authenticated/revoked private-media byte tests;
- upload reservation/object verification tests;
- help/notification cross-user IDOR tests;
- OAuth redirect adversarial tests;
- cache-header and CDN behavior tests for public/private responses;
- audit-log redaction tests;
- video quarantine/probe/publish tests.
