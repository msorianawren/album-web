# Authorization Role Matrix

- Status: IN_PROGRESS
- Milestone: 3
- Source of truth: application guards plus tracked Supabase migrations

## Principals

| Principal/state | Public albums | Locked private card | Private media | Own notifications | Own help threads | Studio | Worker tasks |
|---|---|---|---|---|---|---|---|
| Anonymous | allow | safe preview/null only | deny | deny | deny | deny | deny |
| Authenticated, no grant | allow | safe preview/null only | deny | own only | own only | deny | deny |
| Blocked | public page behavior may render boycott redirect | no private access | deny | existing account notice behavior preserved | writes deny | deny | deny |
| Pending request | allow | locked with pending state | deny | own only | own only | deny | deny |
| Denied request | allow | locked with denied state | deny | own only | own only | deny | deny |
| Revoked | allow | locked | deny new authorization immediately | own only | own only | deny | deny |
| Selected-album grant | allow | authorized only for selected album | selected album only | own only | own only | deny | deny |
| All-private grant | allow | authorized | all available private albums | own only | own only | deny | deny |
| Admin | allow | allow | allow | admin recipient data only through guarded functions | all through Studio guard | allow | deny |
| Founder | allow | allow | allow | founder/admin guarded scope | all through Studio guard | allow, including founder-only actions | deny |
| Worker | no visitor session | no visitor response | task-specific only | append/system task only | task-specific only | no interactive Studio | purpose-labelled task only |

## Private Album Decision Precedence

The target database helper and `src/lib/authorization/role-matrix.ts` use this order:

1. no authenticated principal: deny;
2. blocked account: deny;
3. admin/founder trusted context: allow;
4. latest selected-album revoke: deny;
5. latest selected-album active grant: allow;
6. latest all-private revoke: deny fallback/global access;
7. latest all-private active grant: allow;
8. matching legacy invite: allow during migration window;
9. approved/auto-approved applicable request: allow;
10. pending, denied, or no entitlement: deny.

Revocation must prevent issuance of new private media access immediately. Any already-issued future signed URL remains valid only until its short expiry; that delivery mechanism is handled in Milestone 4.

## Route Enforcement

| Action | Session source | Database client | RLS/final guard | Current status |
|---|---|---|---|---|
| Public album list/detail | optional runtime session | anon | public album/media policies | implemented/local verified |
| Private album list/detail | verified runtime session | transitional trusted path | application grant decision | pending RLS migration/cutover |
| Notification read/update | verified runtime session/JWT | user JWT | recipient `auth.uid()` policies | implemented, authenticated test blocked |
| Help list/detail | verified runtime session/JWT | user JWT | owner `auth.uid()` policies | implemented, authenticated test blocked |
| Help create/append | verified session | transitional trusted path | application owner/cap checks | RPC package prepared; application/role verification blocked |
| Album mutations | non-blocked admin session | trusted admin | route validation plus admin context | implemented, admin test blocked |
| Cron maintenance | exact bearer secret | trusted worker | purpose-labelled context | implemented, valid-secret test blocked |

## Required Database Role Tests

The following tests must run in an isolated Supabase environment after applying pending migrations:

1. anon reads public/updating media but not private media;
2. authenticated user without grant cannot read private media;
3. blocked user cannot read private media despite active grant;
4. pending/denied request does not grant access;
5. selected grant exposes only the selected album;
6. all-private grant exposes private albums;
7. selected revoke overrides fallback access;
8. global revoke prevents global/fallback access;
9. user cannot read/update another user's notifications;
10. user cannot read another user's help thread/messages;
11. admin/founder can use only guarded trusted paths;
12. worker cannot be obtained without the exact configured secret.

For help writes, role verification must additionally prove that anonymous, blocked, cross-owner, closed-thread, archived-thread, and message-cap attempts fail while a valid owner can create and append without partial rows.

Until these execute against a database, Milestone 3 remains IN_PROGRESS and no production-complete authorization guarantee is claimed.
