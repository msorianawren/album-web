# Route and API Register

- Status: COMPLETE
- Milestone: 1
- Audit date: 2026-07-14
- Inventory: 22 page files, 60 route-handler files, one Studio server-action file

## Page Routes

| Route | Rendering/data boundary | Purpose |
|---|---|---|
| `/` | force-dynamic server page with client islands | Landing/editorial homepage and Companion runtime |
| `/albums` | server page plus interactive client grid | Public/updating/private album discovery, search, pagination UI |
| `/albums/[id]` | server detail plus client viewer; loading/error boundaries | Album detail, lock/request state, viewer, engagement, download |
| `/about` | force-dynamic server/client | Public profile/About content |
| `/contact` | server page with session-aware user conversation data | Contact/help entry and conversation |
| `/profile` | client profile shell fed by server session/layout | Account, theme/language/preferences |
| `/login` | public auth page | Google login/register and return path |
| `/boycott` | public blocked-account page | Block reason and denied state |
| `/studio` | force-dynamic protected layout | Studio dashboard |
| `/studio/albums` | protected | Album management |
| `/studio/albums/new` | protected | Album creation |
| `/studio/albums/[id]` | protected | Album/media editing |
| `/studio/albums/order` | protected | Status-specific album ordering |
| `/studio/uploads` | protected | Upload queue/workflow |
| `/studio/media` | protected | Media management |
| `/studio/comments` | protected | Comment moderation |
| `/studio/access-requests` | protected interactive client page | Private-access review |
| `/studio/messages` | force-dynamic protected page | Unified help/legacy conversation management |
| `/studio/analytics` | protected | Activity/analytics |
| `/studio/assistant-preview` | protected | Companion preview/configuration |
| `/studio/security` | protected | Users, blocks, audit/security operations |
| `/studio/settings` | protected | Site and platform settings |
| `/studio/system` | protected | System health/maintenance |

Studio layout calls `requireAdmin`; route handlers also generally enforce role checks. Authenticated runtime verification is blocked by the absence of a test fixture.

## Redirect and Auth Route Handlers

| Route | Methods | Access | Purpose / controls |
|---|---|---|---|
| `/[shortcode]` | GET | public | Resolve configured social/short redirect target |
| `/auth/callback` | GET | OAuth callback | Code exchange or implicit hash bridge, Google provider check, profile sync, session cookies, blocked redirect |
| `/api/auth/login` | POST, DELETE | public start / current session logout | Google OAuth URL, safe relative return path, flow cookies; revoke/clear browser session on logout |
| `/api/auth/register` | POST | public | Google OAuth signup mode with safe return path |
| `/api/auth/session` | POST | callback bridge | Validate tokens/provider, sync profile, set session, return safe target |

## Album, Media, Engagement, and Search APIs

| Route | Methods | Access | Purpose / controls |
|---|---|---|---|
| `/api/albums` | GET, POST | public/session read; admin create | List/search albums; validated create, rate limit, audit |
| `/api/albums/check-slug` | GET | session-aware | Slug availability lookup |
| `/api/albums/[id]` | GET, PATCH, DELETE | detail read; admin mutate | Album detail; validated metadata/status update; delete/soft-delete and R2 cleanup paths |
| `/api/albums/[id]/images` | GET, POST | authorized/session read; admin upload | Media listing/sort and multipart upload with validation/rate limit |
| `/api/albums/[id]/images/[imageId]` | PATCH, DELETE | delegated admin media route | Compatibility alias for media edit/delete |
| `/api/albums/[id]/view-event` | POST | public/session, rate-limited | Record album/media activity |
| `/api/albums/[id]/download` | GET | admin or allowed public album | Request-bound ZIP export, rate/size/count limits, audit/activity |
| `/api/media/[id]` | PATCH, DELETE | admin | Validated media edit/delete, R2 cleanup, audit |
| `/api/media/[id]/download` | GET | admin or allowed public media | Proxied single download, rate limit, private no-store response |
| `/api/search` | GET | public/session | Album search through `getAlbums` |
| `/api/likes` | GET, POST | public/session, rate-limited mutation | Read/toggle like state with album visibility checks |
| `/api/comments` | GET, POST, PATCH | visible read; authenticated write; admin bulk/moderation | Comment creation/filtering, keyword auto-block, rate limit, moderation |
| `/api/comments/[id]` | PATCH, DELETE | admin | Hide/edit/delete comment and audit |

Known boundary notes:

- Album list/detail and engagement calls currently use the default service-role client.
- Database pagination is not complete in core `getAlbums`/detail paths.
- Single media download does not currently support a normal user with approved private access.
- ZIP authorization relies on album detail and existing permanent URL columns.

## Private Access APIs

| Route | Methods | Access | Purpose / controls |
|---|---|---|---|
| `/api/albums/access-request` | POST | non-blocked authenticated user | Multi-album/all-private request; Zod validation, rate limit, risk signals, history/notification/audit |
| `/api/albums/[id]/access-request` | POST | non-blocked authenticated user | Single-album compatibility entry to same workflow |
| `/api/studio/access-requests` | GET, PATCH | admin | Paginated/filterable request list and batch/single decisions |
| `/api/studio/access-requests/[id]` | PATCH, DELETE | admin | Approve/deny/review or delete request |
| `/api/studio/access/history` | GET | admin | Access history with related album/user projection |
| `/api/studio/access/revoke` | POST | admin | Revoke selected/global grants, explicit deny markers, history/notification/audit |
| `/api/studio/access/users` | GET | admin | Access-user aggregate list |
| `/api/studio/access/users/[id]` | GET | admin | User request/grant details |
| `/api/studio/users/[id]/grants` | GET, POST | admin | List/create/update grants and history |
| `/api/studio/invites` | GET, POST | admin | Legacy/global invitation management |
| `/api/studio/invites/[id]` | DELETE | admin | Delete invitation |
| `/api/studio/permissions` | GET, POST | admin | Existing profile/album/invite permission workflow |

## Help, Contact, and Notification APIs

| Route | Methods | Access | Purpose / controls |
|---|---|---|---|
| `/api/contact` | POST | public or authenticated, rate-limited | Validated contact submission, duplicate/spam controls, admin notification |
| `/api/contact/[id]/reply` | POST | owner/session path | Legacy contact reply path with rate limit and notifications |
| `/api/help/threads` | GET, POST | authenticated non-blocked user | Paginated own threads; create confirmed help/assistant handoff |
| `/api/help/threads/[id]/messages` | GET, POST | authenticated owner, non-blocked write | Paginated own messages; no internal notes; ten-message cap |
| `/api/studio/help/threads/[id]` | GET, POST | admin | Read thread, reply/internal note, update status |
| `/api/studio/messages/[id]/reply` | POST | admin | Legacy contact reply path, public identity/notification behavior |
| `/api/notifications` | GET, PATCH | authenticated owner | Unread count, latest 20, mark all read; explicit no-store |
| `/api/notifications/[id]` | POST | authenticated owner | Read/dismiss one recipient-owned notification; explicit no-store |

The unified help path preserves public administrator identity as `Oriana Wren`. The legacy contact path remains and must be covered during consolidation tests.

## Upload and Asset APIs

| Route | Methods | Access | Purpose / controls |
|---|---|---|---|
| `/api/upload` | POST | admin | Server multipart upload, content validation, synchronous processing |
| `/api/upload/presign` | POST | admin | Five-minute direct R2 PUT URL after album/settings/size checks |
| `/api/upload/complete` | POST | admin | Finalize direct upload and insert/process media |
| `/api/upload/url` | POST | admin | Legacy/compatibility URL upload behavior |
| `/api/landing/upload` | POST | admin | Presign landing asset upload |
| `/api/landing/upload/complete` | POST | admin | Fetch/process/finalize landing image |
| `/api/studio/settings/upload-presign` | POST | admin | Presign settings/logo/icon asset |

Direct completion currently lacks a server-side reservation/HEAD/checksum verification step. Video completion trusts client dimensions/duration and does not probe/transcode.

## Landing, Settings, and Studio Content APIs

| Route | Methods | Access | Purpose / controls |
|---|---|---|---|
| `/api/landing` | GET, PATCH | public-safe read; admin write | Landing content read/save and public revalidation |
| `/api/studio/about` | GET, PATCH | admin | About content read/save and revalidation |
| `/api/studio/settings` | GET, PATCH | admin | Site/platform settings read/save and revalidation |
| `/api/profile/assistant-preferences` | GET, PATCH | authenticated non-blocked user | Read/save validated Companion preferences |
| `/api/studio/albums/reorder` | POST | admin | Validated album status/order RPC |
| `/api/studio/recalculate-counts` | POST | admin | Recalculate denormalized album/media/engagement counts |

## Admin, Security, and Operations APIs

| Route | Methods | Access | Purpose / controls |
|---|---|---|---|
| `/api/admin/users` | GET | founder | User/role list and role audit |
| `/api/admin/users/[id]` | PATCH | admin | Block/unblock/profile security action and notification/audit |
| `/api/admin/users/[id]/grant-admin` | POST | founder policy through helper, rate-limited | Promote user and audit unauthorized attempts |
| `/api/admin/users/[id]/revoke-admin` | POST | founder policy through helper, rate-limited | Revoke admin and preserve founder invariants |
| `/api/admin/audit-logs` | GET | founder | Paginated/filterable audit read |
| `/api/studio/users/[id]/activity` | GET | admin | User activity history |
| `/api/studio/r2-health-check` | POST | admin | List/check R2 availability |
| `/api/studio/system-health` | GET | admin | Database/storage/application diagnostic summary |
| `/api/test` | GET | admin | Diagnostic endpoint; production need should be reviewed |

## Scheduled APIs

| Route | Methods | Access | Purpose / controls |
|---|---|---|---|
| `/api/cron/auto-approve-access-requests` | GET | cron secret/platform | Auto-approve eligible pending requests after policy delay |
| `/api/cron/prune-logs` | GET | cron secret/platform | Retention cleanup for audit/contact records |

Cron authentication was source-reviewed but not runtime-verified with deployment credentials. Secrets must not be moved into query strings or logs.

## Server Action

| File | Access | Purpose | Assessment |
|---|---|---|---|
| `src/app/studio/messages/actions.ts` | Studio server action | Legacy message state/update path | Uses its own service-role constructor; migrate to centralized admin repository and verify action authorization/CSRF boundary |

## Cross-Cutting Controls

- Proxy: canonical host, session refresh, protected route redirect, blocked redirect, Origin check for unsafe API methods, process-local coarse rate limit.
- Route guards: `requireUser`, `requireAdmin`, `requireFounder`, plus specialized role helpers.
- Validation: Zod in major mutations; some routes still use manual shape checks.
- Error model: shared `apiError`/`toServerError` in many routes, but correlation IDs/categories are not yet centralized.
- Audit: common helper plus proxy activity logging; coverage and redaction are inconsistent.
- Cache: notifications/help/private downloads use no-store; public data lacks an intentional bounded cache strategy.

## Register Limitations

- “Access” records the intended source guard, not a completed adversarial runtime test.
- Proxy heuristics are not treated as a substitute for route authorization.
- Remote Supabase policies and Vercel cron configuration were not independently inspected.
