# PRE_MERGE_AUTHORIZATION_VERIFICATION

Completed against the remote Supabase project before merging `engineering/production-platform-overhaul` into `main`.

- [x] no-grant authenticated account: expected denied; decision RPC and private-media RLS both denied.
- [x] selected-album grant account: expected selected album only; selected media allowed and second private album denied.
- [x] all-private grant account: expected allowed; media from both private albums allowed.
- [x] revoked account: expected denied; decision RPC and private-media RLS both denied.
- [x] blocked account: expected denied despite an active global grant; decision RPC and private-media RLS both denied.
- [x] cross-user help-thread attempt: expected denied; thread/message reads returned no rows and append failed closed with `PT404`.

## Evidence

- Verified: 2026-07-15 08:59 ICT (`2026-07-15T01:59:59Z`).
- Command: `npm run authz:verify-remote`.
- Boundary exercised: authenticated JWT, `can_access_private_album`, private-media RLS, help-thread/message RLS, and atomic help RPCs.
- Fixtures: five generated, email-confirmed users with no real inbox or personal data; existing private records were read but not modified.
- Cleanup: fixture threads and grants removed before all fixture auth users were deleted; follow-up profile query returned zero remaining fixture users.
- No access token, refresh token, password, session identifier, private object key, or personal account data was persisted or printed.
