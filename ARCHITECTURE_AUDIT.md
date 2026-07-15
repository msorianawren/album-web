# Architecture Audit

- Status: COMPLETE
- Milestone: 1
- Audit date: 2026-07-14
- Branch: `engineering/production-platform-overhaul`
- Evidence sources: tracked application files, migrations through `202607141000_unified_help_chat.sql`, and Milestone 0 runtime checks

## Executive Summary

The application is a Next.js 16 App Router system with server-rendered public pages, client interaction islands, route handlers, one Studio server action, Supabase Auth/Postgres, and one Cloudflare R2 client/bucket abstraction. The existing product surface is broad and should be evolved rather than rewritten.

The principal architecture concern is not missing functionality but blurred trust boundaries. `src/lib/supabase.ts` exports a service-role client as the default database client, and that client is imported by public reads, authenticated-user operations, and trusted admin operations alike. Application guards often protect routes correctly, but RLS is bypassed for those calls. The R2 abstraction similarly maps every key through one public-origin helper, while private originals are distinguished only by key prefix and cache metadata. These boundaries must be separated before private-media guarantees can be claimed.

## System Topology

```text
Browser
  -> Next.js proxy (host, coarse rate limit, origin check, session refresh)
  -> App Router pages / route handlers / one Studio server action
  -> Supabase Auth (anon client for token verification and OAuth)
  -> Supabase Postgres (currently mostly service-role application access)
  -> Cloudflare R2 (one S3 client/bucket abstraction and one public URL origin)
  -> Browser direct PUT for presigned uploads
```

## Next.js Application

### Rendering and component boundaries

- Public routes: `/`, `/albums`, `/albums/[id]`, `/about`, `/contact`, `/profile`, `/login`, `/boycott`.
- Studio routes: dashboard, albums, album edit/create/order, uploads, media, comments, access requests, messages, analytics, assistant preview, security, settings, and system health.
- Root layout performs `getSiteSettings()` and `getPublicSession()` for every rendered page and mounts theme, audio, toast, OAuth-hash, and Oriana Companion runtimes.
- Explicit dynamic rendering exists on `/`, `/about`, Studio layout, Studio messages, notifications, and help routes. Album and Studio data helpers call `noStore()`.
- Client components are used for interactive profile, album, Studio, assistant, audio, notification, and form surfaces. One server action exists in `src/app/studio/messages/actions.ts`.
- `revalidatePath()` is used after landing, About, and settings writes.

### Proxy behavior

`src/proxy.ts` performs:

- production host canonicalization to `www.orianawren.com`;
- in-memory coarse rate limiting;
- Origin-based rejection for cross-origin API mutations;
- session token validation and refresh using the anon Supabase client;
- profile upsert and blocked-user resolution using service role;
- redirect to login with the original path for protected pages;
- redirect to `/boycott` for blocked accounts;
- service-role audit logging for authenticated page views, API mutations, and downloads.

The public-path matcher allows album/media/comment/like/search/auth routes to execute their own authorization logic. Studio and other protected pages are gated by proxy and then generally gated again in route handlers or layouts.

### Cache behavior

- User-specific and Studio data is effectively uncached through dynamic rendering or `noStore()`.
- Public album pages also resolve dynamically and Milestone 0 observed `Cache-Control: no-cache, must-revalidate`.
- Notification and help APIs explicitly use no-store behavior.
- R2 image derivatives use immutable public cache headers, while stored private originals use `private, no-store` metadata. Cache metadata does not itself prevent object access.
- No explicit public-data cache/tag strategy currently separates reusable public content from per-user access state.

## Supabase Architecture

### Client constructors

1. `src/lib/supabase.ts`:
   - default `supabase`: service-role, server-only, no session persistence;
   - `createAnonSupabase()`: anon key, used for OAuth and token verification.
2. `src/proxy.ts`:
   - local anon client for token validation/refresh;
   - local service-role client for profile sync, blocked checks, and audit writes.
3. `src/app/studio/messages/actions.ts`:
   - direct service-role client in a server-action module.

There is no authenticated database client carrying the user's JWT, so ordinary user operations do not currently exercise RLS as the application boundary.

### Database objects

Tracked migrations define these primary tables:

- content: `albums`, `media`, `comments`, `likes`, `album_share_links`;
- access: `album_access_requests`, `album_access_grants`, `album_access_history`, `album_invites`;
- identity/security: `user_profiles`, `audit_logs`, `security_rate_limits`;
- communication: `contact_messages`, `contact_message_replies`, `help_threads`, `help_messages`, `notifications`;
- presentation/configuration: `landing_page_settings`, `site_settings`, `about_profile`;
- analytics/activity: `user_album_activity`.

Tracked SQL also defines count-refresh triggers, updated-at triggers, invitation email normalization, album reorder/status functions, RLS policies, and indexes for album ordering, media sort/filter paths, access predicates, notifications, help pagination, audit logs, and activity.

No migration-defined views were found.

### RLS posture

- RLS policies exist for public card-safe content, public/updating media, comments, likes, user profiles, user-owned access requests/grants/invites, notifications, contact replies, help threads/messages, and admin roles.
- Direct client access is denied for audit logs, settings, landing writes, profile writes, and rate limits.
- Help policies enforce owner-only user access, hide internal notes, require sender identity, and permit non-blocked admin/founder management.
- Because the application broadly uses service role, policy correctness is not sufficient evidence of runtime enforcement. Role-based RLS tests are not present yet.

## Authentication and Roles

- Login and registration both initiate Google OAuth through Supabase.
- The intended return path is normalized to a same-site relative path and stored in short-lived, `httpOnly`, `SameSite=Lax` cookies.
- Callback supports both authorization-code exchange and an implicit hash bridge, then stores access and refresh tokens in secure production cookies.
- Access tokens are verified with `auth.getUser`; refresh tokens are used in proxy when needed.
- Profile rows are upserted after authentication and on server session resolution.
- Effective role comes from `user_profiles.role`, with `DEFAULT_OWNER_ID` overriding to founder.
- `requireUser`, `requireAdmin`, and `requireFounder` all reject blocked users.
- Public session output contains the current user's own email/profile data; help-chat serialization strips administrator identity and always presents admin replies as `Oriana Wren`.

## Album and Access Architecture

- Album listing reads all matching rows, sorts them in application code when status is omitted, and then loads all eligible media rows before retaining four previews per album.
- Album detail loads up to 250 media rows, then loads likes/comments for all media and sorts in application code.
- Public, updating, and private statuses share the same album model.
- Private access is decided from admin status, selected/global grants, legacy invites, and approved requests. Pending/rejected/revoked states are represented.
- Access requests support selected albums or all private albums, phone normalization/hash-based risk signals, duplicate detection, delayed auto-approval, audit/history, and notifications.
- Admin approval writes grants and updates the request; revoke marks active grants revoked or inserts explicit revoked rows.
- Album cards hide cover/preview data for unapproved private albums in application serialization.

## R2 and Media Architecture

- `src/lib/r2.ts` creates one S3-compatible client and resolves one bucket.
- `getPublicUrl(key)` maps any key through `R2_PUBLIC_URL`; it does not classify public/private keys.
- Images are decoded with Sharp, rotated, bounded by pixel count, metadata-stripped, and emitted as public, thumbnail, and medium WebP variants.
- Optional originals are stored under `private/albums/...`, but the same bucket/client abstraction is used and public-prefix isolation has not been externally verified.
- Videos are uploaded to `albums/.../original.*`, receive a permanent public URL, and are inserted with `processing_status=pending` and `security_status=needs_review`. No trusted FFprobe/FFmpeg worker exists.
- Presigned PUT URLs expire after five minutes and bind content type, but completion trusts browser-supplied key, size, dimensions, and duration and does not HEAD/checksum-verify the uploaded object first.
- Single downloads and ZIP generation proxy/fetch existing media URLs. ZIP generation is synchronous in the request and transcodes images with Sharp.

## Communication Architecture

- `help_threads` and `help_messages` form the current unified help system; legacy contact records are migrated/linked rather than replaced.
- User thread and message reads are owner-filtered and paginated at 20 rows.
- Internal notes are excluded from public reads.
- A user may not append after ten consecutive user messages without an admin reply.
- Admin replies are serialized as `Oriana Wren`, with no public admin avatar.
- Contact, assistant handoff, Studio Messages, notifications, audit events, and database-backed action rate limits are integrated.
- Notification count performs a head/count query; list fetches the latest 20 only and uses no-store headers.

## UX and Platform

- Site settings, landing blocks, About content, theme, language dictionaries, assistant preferences, mascot selection, reduced-motion behavior, and optional audio already exist.
- Audio defaults off and public audio assets were verified accessible in Milestone 0.
- Root `<html lang>` is currently fixed to English even though UI language can change.
- CSP and security headers are centralized in `next.config.ts`; CSP still permits `unsafe-inline`, `unsafe-eval`, Google Fonts, and broad R2 hosts.
- Dynamic metadata exists at root, but public-only sitemap/robots and per-album privacy verification remain milestone work.
- Album viewer supports keyboard navigation, Escape, zoom, and fullscreen; complete focus-trap/restoration and WCAG journey verification remain unverified.

## Confirmed Architectural Priorities

1. Remove silent production sample fallbacks and introduce explicit error semantics.
2. Split anon, authenticated-RLS, admin, and worker Supabase clients.
3. Establish actual object-level private-media storage and delivery before claiming URL privacy.
4. Centralize media delivery descriptors so components cannot select arbitrary URL columns.
5. Add verified upload completion and asynchronous image/video processing jobs.
6. Replace unbounded album/media reads and N+1-like preview aggregation with database pagination and bounded queries.
7. Separate cache policies for public content and private/user-specific content.

## Audit Limitations

- The migration files are the schema source reviewed here; remote application of every migration was not independently verified.
- The user reported `202607141000_unified_help_chat.sql` applied successfully, but this audit does not treat that as an independent database verification.
- No authenticated test fixture was available, so authenticated private, Studio, and founder flows are source-verified only.
- Public accessibility of the R2 `private/` prefix was not tested with a real object and is recorded as an unverified risk, not a confirmed exposure.
