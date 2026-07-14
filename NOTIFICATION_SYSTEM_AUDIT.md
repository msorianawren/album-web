# Notification System Audit

## Root Cause

The confirmed failing path was the admin approval endpoint for private album access requests:

- `PATCH /api/studio/access-requests/[id]` updated `album_access_requests`.
- It inserted an active `album_access_grants` row, so album access worked.
- It did not create a `notifications` row for `requester_user_id`, so the user notification center had nothing to show.

Secondary issues found during the audit:

- Direct grants wrote legacy notification types: `access_granted` / `access_revoked`.
- Message and grant endpoints inserted raw notification rows instead of using a shared helper.
- User replies notified `DEFAULT_OWNER_ID` directly instead of querying active admin/founder recipients.
- The notification list endpoint returned full rows and the UI derived unread count from the list.
- `manifest.webmanifest` and notification-style user data need explicit no-store behavior to avoid stale UI.

## Data Model

Table: `public.notifications`

Safe fields returned to users:

- `id`
- `type`
- `title`
- `body`
- `target_url`
- `status`
- `created_at`
- `read_at`

Allowed status values:

- `unread`
- `read`
- `dismissed`

Allowed type values:

- `album_access_granted`
- `album_access_revoked`
- `access_request_approved`
- `access_request_rejected`
- `message_reply`
- `account_blocked`
- `account_unblocked`
- `admin_new_request`
- `admin_new_message`

RLS expectation:

- Authenticated users can select only their own notifications.
- Authenticated users can update only their own notification status.
- Anonymous users cannot read notifications.
- Server-side inserts use the service role client, while RLS still protects direct client access.

## Event Matrix

| # | Event | Source | Recipient | Type | Target | Status |
|---|---|---|---|---|---|---|
| 1 | Private album request approved | `PATCH /api/studio/access-requests/[id]` | requester user | `access_request_approved` | album URL or `/albums` | Fixed |
| 2 | Private album request rejected | `PATCH /api/studio/access-requests/[id]` | requester user | `access_request_rejected` | album URL or `/albums` | Fixed |
| 3 | Direct selected album grant | `POST /api/studio/users/[id]/grants` | target user | `album_access_granted` | album URL if one, else `/albums` | Fixed |
| 4 | Direct all-private grant | `POST /api/studio/users/[id]/grants` | target user | `album_access_granted` | `/albums` | Fixed |
| 5 | Selected album revoke | `POST /api/studio/access/revoke` | target user | `album_access_revoked` | `/albums` | Fixed |
| 6 | All-private revoke | `POST /api/studio/access/revoke` | target user | `album_access_revoked` | `/albums` | Fixed |
| 7 | Admin reply to message | `POST /api/studio/messages/[id]/reply` | message owner | `message_reply` | `/contact` | Fixed |
| 8 | Account blocked | `PATCH /api/admin/users/[id]` | blocked user | `account_blocked` | `/boycott` | Fixed, but blocked users are redirected by access policy |
| 9 | Account unblocked | `PATCH /api/admin/users/[id]` | unblocked user | `account_unblocked` | `/albums` | Fixed |
| 10 | New private album access request | `POST /api/albums/[id]/access-request` | active admins/founder | `admin_new_request` | `/studio/access-requests` | Fixed |
| 11 | New contact message | `POST /api/contact` | active admins/founder | `admin_new_message` | `/studio/messages` | Fixed |
| 12 | User reply in message thread | `POST /api/contact/[id]/reply` | active admins/founder | `admin_new_message` | `/studio/messages` | Fixed |
| 13 | Upload failure | Upload APIs | Admin | N/A | N/A | Not implemented before this task |
| 14 | Security warning | Security APIs | Admin | N/A | N/A | Existing audit logs remain primary channel |

## API Behavior

`GET /api/notifications?mode=count`

- Requires a signed-in user.
- Returns count only.
- Counts `recipient_user_id = session.userId` and `status = unread`.
- Uses `Cache-Control: no-store`.

`GET /api/notifications`

- Requires a signed-in user.
- Returns latest 20 non-dismissed notifications for the current user.
- Excludes unsafe metadata from the response.
- Uses `Cache-Control: no-store`.

`POST /api/notifications/[id]`

- Requires a signed-in user.
- Accepts `read` or `dismissed`.
- Updates only the row matching both notification id and current `recipient_user_id`.

`PATCH /api/notifications`

- Requires a signed-in user.
- Marks all unread notifications for the current user as read.

## UI Refresh Strategy

- Header bell fetches unread count after mount.
- Header bell refreshes count on focus, visibility change, and a low-frequency interval.
- Opening the notification panel fetches the latest 20 notifications.
- Mark read, dismiss, and mark all read update local state immediately.
- The notification target URL is used only when it is same-site relative.

## Security Notes

- Notification helper rejects invalid recipients.
- Notification helper allowlists type names.
- Notification helper accepts only same-site relative `targetUrl`.
- Notification helper truncates text and metadata.
- Notification payloads must not include signed URLs, R2 keys, auth tokens, refresh tokens, raw headers, session IDs, or private media URLs.

## Reproduction Test For The Confirmed Bug

Expected after this fix:

1. Normal user submits a private album request.
2. Admin approves it in Studio.
3. `album_access_requests.status` becomes `approved`.
4. An active `album_access_grants` row exists.
5. A `notifications` row exists with:
   - `recipient_user_id = requester_user_id`
   - `type = access_request_approved`
   - `status = unread`
   - `target_url = /albums/<slug>` when slug exists.
6. `GET /api/notifications?mode=count` increments for that user.
7. Opening the user notification panel shows the notification.
8. Clicking it opens the album.

## Production Migration Note

Run `supabase/migrations/202607140200_notification_lifecycle_hardening.sql` in Supabase if production has not applied migrations automatically. It normalizes legacy notification types, reinforces constraints, adds indexes, and recreates RLS policies idempotently.
