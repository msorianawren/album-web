# Oriana Companion Chat Infrastructure

## Before This Change

- Contact used `contact_messages` plus `contact_message_replies`.
- The Companion answered deterministic FAQ content and could only write a temporary Contact draft.
- Studio loaded every legacy contact message and every reply at once.

## Unified Model

- New conversations use `help_threads` and `help_messages`.
- Sources are `contact`, `assistant`, `private_access`, and `system`.
- Threads carry only the owner identity required for support, lifecycle status, and timestamps.
- Messages are paginated at 20 records. Internal notes are stored separately and never returned by a user endpoint.
- Existing Contact tables remain untouched. The migration idempotently maps their messages and replies into the unified read model, so Studio keeps the historical inbox without duplicating rows.

## Handoff Behavior

- The deterministic assistant offers a handoff for low-confidence and eligible answers.
- A thread is created only after the visitor confirms.
- Authenticated users see the resulting conversation inside the Companion; no full history is stored in browser storage.
- Assistant intent is retained only as a compact internal handoff note, never as a debug score shown to users.

## Identity And Authorization

- Every public admin reply is written and returned as `Oriana Wren`.
- Personal admin name, email, avatar, and sender ID are excluded from user responses.
- User routes verify ownership server-side. Studio routes require the existing admin guard server-side.
- RLS is enabled for both tables; direct users can only read their own non-internal messages and append user messages to their own active thread.

## Abuse And Notifications

- Creation is limited to 5 threads per hour per user.
- Sending is limited to 10 messages per minute, with an additional 10 consecutive user-message limit per thread.
- Blocked users cannot create or append messages.
- New user messages notify active admins. Public admin replies notify the thread owner with a same-site `/contact?thread=...` URL.
- Audit events contain IDs and action metadata only, not message bodies.

## Performance

- The Companion remains dynamically imported.
- Chat opens only after user action and loads the latest 20 messages.
- Studio lists 20 threads per page, does not fetch all messages with the inbox, and loads a thread only when selected.
- No realtime subscriptions or global polling were added.

## Validation

- TypeScript check: passed.
- Final lint and production build are required after the full change set.

## Known Limitations

- Legacy Contact records remain the source record and are mirrored into the unified read model by the migration. Guest-only historical threads remain admin-only because no authenticated owner exists.
- Guest Contact remains on the existing protected legacy route. New unified support chat intentionally requires login.
- Realtime delivery is intentionally deferred; users can use the visible refresh control to check for replies.
