# Service-Role Usage Register

- Status: COMPLETE
- Milestone: 1
- Audit date: 2026-07-14

## Constructor Register

| Location | Constructor | Purpose | Assessment |
|---|---|---|---|
| `src/lib/supabase.ts` | default `supabase` using `SUPABASE_SERVICE_ROLE_KEY` | Shared database client used across public, user, admin, and system modules | Over-broad boundary; must be replaced by scoped clients |
| `src/lib/supabase.ts` | `createAnonSupabase()` using anon key | OAuth, token verification, code/session exchange | Appropriate for auth; later add JWT-bound user DB client |
| `src/proxy.ts` | local anon client | Validate/refresh session | Appropriate |
| `src/proxy.ts` | local service-role client | Profile upsert, blocked check, audit writes | Trusted use, but mixed into request proxy and duplicated constructor |
| `src/app/studio/messages/actions.ts` | direct service-role client | Studio legacy message action | Trusted server action after auth review; should use centralized admin client |

## Classification Rules

- **Public read**: must use anon/RLS-safe public projection or a narrowly trusted read repository that cannot expose private columns.
- **Authenticated-user read/mutation**: should use a JWT-bound client so RLS enforces ownership, with server guard as defense in depth.
- **Admin/founder mutation**: may use trusted admin client only after centralized role validation.
- **Worker/system**: may use service role from an explicitly named server-only module and must not accept untrusted ownership identifiers without verification.
- **Current service-role import** below means the module imports the default service-role client, even when the route has an application guard.

## Public and Mixed Read Modules

| Module | Tables/operations | Current guard | Required boundary |
|---|---|---|---|
| `src/lib/albums.ts` | albums/media/access/grants/invites/likes/comments reads | session-aware application filtering | Split public projection, JWT user access, and trusted admin repository |
| `src/lib/about.ts` | About read/upsert | callers decide | Anon public read; admin-only trusted write |
| `src/lib/landing.ts` | landing read/upsert | callers decide | Anon public read; admin-only trusted write |
| `src/lib/site-settings.ts` | settings read/upsert | callers decide | Public-safe settings projection; admin-only trusted write |
| `src/app/contact/page.tsx` | user's contact/reply reads | current-session filter | JWT user client/RLS; avoid service role in page component |
| `src/app/api/albums/route.ts` | album GET and admin POST | public session / admin | Split GET public/user repository from POST admin repository |
| `src/app/api/albums/check-slug/route.ts` | album existence read | public session | Public-safe lookup or admin-only behavior depending product intent |
| `src/app/api/albums/[id]/images/route.ts` | media GET and admin upload POST | session/admin | Split authorized user read from admin mutation |
| `src/app/api/likes/route.ts` | like reads/writes | session and rate limit | JWT user client/RLS; anonymous client-ID policy requires explicit design |
| `src/app/api/comments/route.ts` | comment list/create/moderate | user/admin and rate limit | Split public read, JWT create, admin moderation |
| `src/app/api/comments/[id]/route.ts` | moderation/edit/delete | admin | Trusted admin client after guard |
| `src/app/api/contact/route.ts` | contact insert/duplicate lookup | session, rate limit | Validated server write; narrowly trusted repository |
| `src/app/api/contact/[id]/reply/route.ts` | reply insert/read | session/rate limit | Owner JWT path and separate admin path |

## Authentication and Identity Modules

| Module | Tables/operations | Current guard | Required boundary |
|---|---|---|---|
| `src/lib/auth.ts` | profile select/upsert | verified Supabase user token | Narrow trusted profile-sync helper; user profile read can use JWT/RLS |
| `src/app/auth/callback/route.ts` | profile upsert through auth helper | successful Google session | Trusted profile-sync helper |
| `src/app/api/auth/session/route.ts` | profile/audit select/insert | token verification in route | Narrow auth-completion service, no broad export |
| `src/app/api/auth/login/route.ts` | audit through helper on logout | current session | Narrow audit writer |
| `src/app/api/auth/register/route.ts` | no table operation | OAuth initiation | Anon auth client only |
| `src/lib/role-management.ts` | profiles/audit select/update | caller expected founder/admin | Trusted role repository with guard in same public API |
| `src/app/api/admin/users/route.ts` | role-management reads | founder | Trusted founder client |
| `src/app/api/admin/users/[id]/route.ts` | profile block/unblock | admin | Trusted admin client; protect founder invariants |
| `src/app/api/admin/audit-logs/route.ts` | audit read | founder | Trusted founder client |

## User-Owned Data Modules

| Module | Tables/operations | Current guard | Required boundary |
|---|---|---|---|
| `src/lib/access-request-submit.ts` | grants/requests read+insert | `requireUser`, rate limit | JWT user client with RLS; trusted history/notification helpers separately |
| `src/lib/help-chat.ts` user functions | help threads/messages read+insert+update | session ownership filters and blocked checks | JWT user client/RLS |
| `src/lib/notifications.ts` | notification insert and recipient lookup | called by trusted workflows | Trusted notification writer; never browser-selectable recipient |
| `src/app/api/notifications/route.ts` | recipient list/count/mark-all | current user filter | JWT user client/RLS |
| `src/app/api/notifications/[id]/route.ts` | recipient item update | current user filter | JWT user client/RLS |
| `src/app/api/profile/assistant-preferences/route.ts` | profile read/upsert | `requireUser` | JWT user client/RLS or narrow validated profile RPC |
| `src/lib/user-activity.ts` | activity read/insert | current session | JWT user insertion/read-own or trusted append-only writer |
| `src/lib/comment-security.ts` | comment security lookup | caller workflow | Narrow trusted moderation repository |

## Admin and Studio Modules

All modules below are legitimate candidates for a trusted admin client only after `requireAdmin`/`requireFounder` succeeds. They should not import a generic client whose trust level is invisible.

| Module/group | Tables/operations | Current authorization |
|---|---|---|
| `src/lib/access-request-workflow.ts` | requests, grants, history, albums read/write | called from guarded admin/cron workflows |
| `src/lib/studio-data.ts` | albums, media, comments, users, activity, audit reads | Studio callers |
| `src/lib/media.ts` | albums/media read/insert/update | called by admin upload routes |
| `src/lib/audit.ts` | audit insert | caller supplies session |
| `src/lib/security-rate-limit.ts` | rate-limit read/upsert/update | trusted server helper |
| `src/app/api/albums/[id]/route.ts` | album/media update/delete/RPC | admin |
| `src/app/api/media/[id]/route.ts` | media/album update/delete | admin |
| `src/app/api/upload/route.ts` | media storage accounting/read | admin |
| `src/app/api/upload/presign/route.ts` | album/media reads | admin |
| `src/app/api/studio/access-requests/route.ts` | request/album reads and decisions | admin |
| `src/app/api/studio/access-requests/[id]/route.ts` | decision/delete | admin |
| `src/app/api/studio/access/history/route.ts` | history/albums/users read | admin |
| `src/app/api/studio/access/revoke/route.ts` | grant revoke/insert | admin |
| `src/app/api/studio/access/users/route.ts` | grants/requests/profiles read | admin |
| `src/app/api/studio/access/users/[id]/route.ts` | grants/requests read | admin |
| `src/app/api/studio/users/[id]/grants/route.ts` | grants read/insert/update | admin |
| `src/app/api/studio/users/[id]/activity/route.ts` | activity read | admin |
| `src/app/api/studio/invites/route.ts` | invite read/insert | admin |
| `src/app/api/studio/invites/[id]/route.ts` | invite delete | admin |
| `src/app/api/studio/permissions/route.ts` | profiles/albums/invites read/write | admin |
| `src/app/api/studio/albums/reorder/route.ts` | reorder RPC | admin |
| `src/app/api/studio/recalculate-counts/route.ts` | aggregate reads and album updates | admin |
| `src/app/api/studio/messages/[id]/reply/route.ts` | legacy contact reply write | admin |
| `src/lib/help-chat.ts` admin functions | help reads/writes | route-level admin plus helper session check on writes |

## Worker and Scheduled Modules

| Module | Purpose | Current authorization | Required boundary |
|---|---|---|---|
| `src/app/api/cron/auto-approve-access-requests/route.ts` | select/update requests and invoke grant workflow | cron-secret path, not runtime-verified | Worker client in explicit cron module; constant-time/platform auth |
| `src/app/api/cron/prune-logs/route.ts` | delete expired audit/contact rows | cron-secret path, not runtime-verified | Worker client; bounded retention transaction and audit |
| Future media worker | probe/transcode/process jobs | not implemented | Dedicated worker client and queue claim semantics |

## Direct R2 Trusted Uses

These do not use Supabase service role but carry equivalent storage trust and must remain server-only:

- `src/lib/r2.ts` central S3 client;
- admin upload/presign/complete routes;
- landing/settings asset upload routes;
- Studio R2 health check;
- album/media delete routes.

## Refactor Target

Create explicit server-only modules with names that reveal trust:

```text
db/public.ts          anon public projection client
db/user.ts            request-scoped JWT client governed by RLS
db/admin.ts           trusted admin client, callable only after role guard
db/worker.ts          trusted worker/service client
db/audit.ts           append-only redacted audit writer
```

Rules for migration:

1. No public or user module imports the admin/worker constructor.
2. User ID from request body/query is never authorization; derive it from verified session.
3. Admin helpers accept an already-validated admin context or perform the guard themselves.
4. Worker helpers validate job ownership/state and do not expose generic query access.
5. Migrate one route family at a time with RLS/integration tests and an independently revertible commit.

## Verification Gaps

- No automated import-boundary rule currently prevents future broad service-role imports.
- No isolated local Supabase role suite currently proves RLS for anonymous/user/blocked/revoked/admin states.
- Remote schema/policy application was not independently queried during this audit.
