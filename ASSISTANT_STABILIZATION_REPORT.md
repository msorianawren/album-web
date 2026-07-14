# Assistant Stabilization Report

## Root Causes

1. Assistant preferences save returned 500 because the API updated `user_profiles.metadata`, while the base database migration did not add that column. The API also used `update().single()`, so a missing profile row could fail instead of creating a row.
2. Audio preload failed noisily because ambient preload cached promises that re-threw fetch/decode failures. Those rejected promises could surface later as unhandled promise errors.
3. Google Fonts were linked from `fonts.googleapis.com`, but CSP allowed only local styles and fonts.

## Files Changed

- `next.config.ts`
- `src/app/api/profile/assistant-preferences/route.ts`
- `src/components/ui/AudioUXProvider.tsx`
- `src/hooks/useAssistantPreferences.ts`
- `src/hooks/useUIPreferences.ts`
- `src/lib/audio-ux.ts`
- `src/proxy.ts`
- `supabase/migrations/202607140600_assistant_profile_metadata.sql`
- `ASSISTANT_STABILIZATION_REPORT.md`

## Migration / RLS

- Added an idempotent, non-destructive migration:
  - `alter table public.user_profiles add column if not exists metadata jsonb not null default '{}'::jsonb;`
- Existing RLS remains unchanged. Direct authenticated client writes to `user_profiles` are still denied; the server route uses the server-side Supabase client.
- No secrets, signed URLs, R2 keys, chat history, phone numbers, or private URLs are stored in this migration.

## API Behavior

Before:
- Authenticated save could fail with 500 if `metadata` was missing or no profile row was updated.
- Network errors in the preference hook could reject the save promise.

After:
- Guest PATCH returns 401 JSON.
- Invalid payload returns 400 JSON.
- Authenticated save upserts the caller's own profile row and stores normalized preferences in `metadata.assistant_preferences`.
- Server DB errors return safe JSON without raw stack traces.
- Frontend catches fetch failures and shows a save error instead of throwing an unhandled promise.

## Audio Handling

Before:
- Sound was enabled by default.
- Ambient playback could start after first interaction and preload all tracks.
- Failed fetch/decode in preload re-threw, leaving rejected promises in the background.
- Static audio files matched the auth proxy and could be redirected to `/login`, so the request returned HTML instead of an MP3.

After:
- Sound is off by default.
- Ambient audio starts only when the user enables sound and the browser allows audio.
- Preload failures are optional, dev-only warnings and return `null`.
- `playAmbient()` and provider calls catch promise failures.
- Static audio extensions are excluded from the auth proxy matcher.
- `/audio/harp.mp3` exists and returns 200 locally.

## CSP

Before:
- `style-src` and `font-src` blocked Google Fonts.

After:
- `style-src` and `style-src-elem` allow only `https://fonts.googleapis.com`.
- `font-src` allows only `https://fonts.gstatic.com` in addition to self/data.
- CSP remains strict; no wildcard was added.

## 20-Character Compatibility

- Registry still contains 20 assistant character IDs.
- All 20 IDs normalize successfully.
- Invalid stored character falls back to `capybara`.
- Profile picker still uses static card images for non-selected mascots.
- Assistant panel still uses the selected character via preferences.
- SVGs are still public URL assets and are not imported as JS modules.

## Verification

- Guest `/api/profile/assistant-preferences` PATCH: 401 JSON, no 500.
- `/api/notifications?mode=count` as guest: 401.
- `/profile`: 200.
- `/contact`: 200.
- `/albums`: 200.
- `/audio/harp.mp3`: 200 with `Content-Type: audio/mpeg`, no login redirect.
- Browser reload of `http://localhost:3007/profile`: no console errors or warnings observed; sound off state visible.
- Assistant smoke:
  - private access question: `private_access_help`
  - ZIP question: `download_zip_help`
  - unknown question: `unknown`

## Lint / Build

- `npm run lint`: pass, 0 errors, 14 existing warnings.
- `npm run build`: pass.

## Remaining Warnings / Issues

- Existing lint warnings remain outside this stabilization scope:
  - Google font warning in `src/app/layout.tsx`
  - several existing `<img>` warnings
  - existing unused variables in `src/lib/albums.ts`
  - existing missing hook dependency in `src/components/studio/SecurityConsole.tsx`
- Logged-in remote save requires the new Supabase migration to be applied to the target database before production can persist `metadata.assistant_preferences`.
