# Supabase Boundary Report

- Status: IN_PROGRESS
- Milestone: 3
- Updated: 2026-07-14

## Objective

Replace the implicit server-wide service-role client with trust-specific boundaries while preserving current albums, grants, notifications, help conversations, Studio, and scheduled work.

## Implemented Boundaries

| Boundary | Module | Credential | Construction rule |
|---|---|---|---|
| Public server | `src/lib/db/public.ts` | anon key | No user identity; database RLS governs public projections |
| Authenticated user | `src/lib/db/user.ts` | anon key plus request JWT | Token is read only from the runtime Authorization header or Supabase auth cookie |
| Trusted admin | `src/lib/db/admin.ts` | service role | Client is returned only after `requireAdmin`/`requireFounder` validates a non-blocked session |
| Trusted worker | `src/lib/db/worker.ts` | service role | Client is returned only after exact constant-time bearer-secret validation |
| Transitional broad client | `src/lib/supabase.ts` | service role | Legacy only; no new route should import it |

The service-role constructor for new code lives in `src/lib/db/trusted-service.ts`. Static tests prevent the public/user client modules from importing it and limit its direct boundary importers to admin/worker modules.

## Migrated Route Families

| Family | Result | Database boundary |
|---|---|---|
| Public album list/detail and public/updating media | IMPLEMENTED_NOT_VERIFIED for production | anon/RLS; local HTTP verified |
| Unauthorized private card/detail response | IMPLEMENTED_NOT_VERIFIED for production | safe preview or null; no private media returned |
| Album create/update/delete/upload accounting/reorder | IMPLEMENTED_NOT_VERIFIED for authenticated admin | guarded trusted admin client |
| Log retention and access auto-approval cron | IMPLEMENTED_NOT_VERIFIED for valid scheduled invocation | fail-closed trusted worker client |
| Notification count/list/read/dismiss | IMPLEMENTED_NOT_VERIFIED for authenticated user | request JWT/RLS; guest denial verified |
| Help thread/message list reads | IMPLEMENTED_NOT_VERIFIED for authenticated user | request JWT/RLS; guest denial verified |
| Public comment list and admin comment-item moderation | IMPLEMENTED_NOT_VERIFIED for authenticated admin | anon/RLS reads; guarded admin mutations; guest HTTP verified |
| Founder audit-log list and admin user block/unblock | IMPLEMENTED_NOT_VERIFIED for authenticated admin/founder | guarded trusted queries; guest proxy denial verified |

## Database Work

`supabase/migrations/202607141830_private_album_rls.sql` adds:

- `public.can_access_private_album(uuid)`;
- authenticated private-media select policy;
- authenticated private-comment select policy;
- blocked-user and explicit revoke precedence;
- selected grant, all-private grant, legacy invite, and approved-request support.

`supabase/rollbacks/202607141830_private_album_rls_rollback.sql` removes only those additive objects.

`supabase/migrations/202607142115_user_help_write_rpcs.sql` adds authenticated, security-definer RPCs that:

- derive the user from `auth.uid()` rather than caller-provided identity;
- reject blocked users and invalid input in the database;
- create a thread, first message, and optional Companion internal note atomically;
- lock an owned thread before enforcing status and the ten-consecutive-message cap;
- append the message and update thread state in one transaction;
- revoke execution from `public` and `anon` while granting only `authenticated`.

`supabase/rollbacks/202607142115_user_help_write_rpcs_rollback.sql` removes only those two functions.

The user reports that the private RLS and help RPC migrations were applied remotely on 2026-07-14. This workspace has not independently executed database role tests, so application private-media reads and help writes remain on their legacy trusted paths until verification. Remaining order: role verification, isolated application cutover, observation, then legacy removal.

## Remaining Legacy Surface

There are 43 tracked source files still importing `@/lib/supabase`. They are intentionally not hidden by re-exporting the new trusted client under the old name.

| Class | Representative modules | Required next boundary |
|---|---|---|
| Authentication/profile bootstrap | `auth.ts`, auth routes/callback | narrow profile bootstrap repository plus JWT client |
| Private access | `albums.ts`, access request submit/workflow | JWT/RLS after pending migration; guarded admin/worker helper for decisions |
| Help writes/admin | `help-chat.ts`, Studio help route | narrow transactional user RPC plus trusted admin repository |
| Notifications creation | `notifications.ts` | trusted append-only notification writer |
| User comments/likes/preferences/activity | related API/lib modules | request JWT/RLS and ownership tests |
| Studio/admin | Studio routes, `studio-data.ts`, role management | guarded trusted admin context by route family |
| Upload/media | upload routes, `media.ts` | trusted admin/worker repositories plus verified upload ownership |
| Public settings/content | about/landing/site settings | anon public reads and guarded admin writes |
| Audit/rate limits | `audit.ts`, `security-rate-limit.ts` | narrow append/update-only trusted helpers |

Other files mentioning `SUPABASE_SERVICE_ROLE_KEY` are primarily health/config diagnostics. Actual constructors remain `src/lib/supabase.ts` and `src/lib/db/trusted-service.ts`; the former is transitional.

## Security Properties

- Public and JWT client modules cannot read the service-role environment variable.
- User identity comes from a verified request token/session, never a body/query user ID.
- Notification and help reads retain explicit owner filters and gain RLS as defense in depth.
- Admin clients are created only after non-blocked role validation.
- Worker authentication fails closed when the secret is missing and uses constant-time exact comparison.
- User/private/admin responses remain `no-store` where already required.
- Raw Supabase errors were removed from the migrated album/cron/notification routes.
- Admin route query paths use guarded clients, but shared auth bootstrap and legacy audit/notification append helpers remain transitional broad-client dependencies.

## Verification

- ESLint: pass with 14 unchanged warnings.
- TypeScript: pass.
- Unit/static authorization tests: 27 pass.
- Production build: pass; 49 routes generated.
- Local public album list/detail and locked-private privacy checks: pass.
- Guest notification/help denial checks: pass.
- Public comment GET and guest comment PATCH/DELETE checks: pass.
- Guest Founder audit-log and user block requests are denied by the proxy: pass.
- Missing/invalid cron secret checks: pass.
- Authenticated user/admin and valid-worker fixtures: BLOCKED_EXTERNAL.
- SQL execution and database role tests: BLOCKED_EXTERNAL.

## Rollback

- Client and route-family changes are isolated commits and can be reverted independently.
- The RLS rollback removes only the new policies/function.
- Do not deploy a JWT private-media cutover before applying/verifying the migration.
- The legacy client remains available during the migration window; remove it only after every import is classified, migrated, and tested.

## Next Actions

1. Apply and role-test the pending private-album migration.
2. Role-test the applied help create/append RPCs; application writes now use JWT/RPC, but authenticated verification remains pending.
3. Migrate comments/likes/preferences as independent user route families.
4. Migrate remaining Studio families behind trusted admin contexts.
5. Remove `src/lib/supabase.ts` only when the remaining import count reaches zero.
