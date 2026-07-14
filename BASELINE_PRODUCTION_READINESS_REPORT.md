# Baseline Production Readiness Report

## Scope

Milestone 0 records the state of album-web before production-overhaul architecture changes. It is a regression reference, not a claim that the platform already satisfies the final acceptance criteria.

## Repository Baseline

- Branch: `engineering/production-platform-overhaul`
- Starting commit: `f82cb5eb0e78f9ea4b5aa9c34d6a20a69cfead2d`
- Dependency install: `npm install` completed; 425 packages audited, 0 known vulnerabilities.
- Application shape: 22 page files, 60 API route files, 62 total route handlers, 1 nested layout file plus the root layout.
- Database migrations: 31 SQL files tracked under `supabase/migrations/`.
- Latest ordered migration: `202607141000_unified_help_chat.sql`.
- Legacy non-timestamp migration also exists: `fix_missing_table.sql`; ordering and continued necessity require audit.

## Validation Results

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | PASS WITH WARNINGS | 0 errors, 14 warnings |
| `npm run typecheck` | PASS | Added standalone `tsc --noEmit` script |
| `npm run build` | PASS | Next.js 16.2.10 production build generated 49 routes |
| `npm install` audit | PASS | 0 known vulnerabilities; install-script approval warning remains for Sharp and unrs-resolver |

### Existing Lint Warnings

- External font loading in `src/app/layout.tsx`.
- Direct `<img>` usage in landing and several Studio components.
- Missing `search` dependency in `SecurityConsole` effect.
- Three unused revocation variables in `src/lib/albums.ts`.

These are baseline findings and were not hidden or disabled.

## Local Route Smoke Test

Local base: `http://localhost:3011`.

| Route/flow | Result |
| --- | --- |
| `/`, `/albums`, public album, locked private album, `/about`, `/contact`, `/profile`, `/login` | HTTP 200 |
| Studio dashboard, Albums, Uploads, Access Requests, Messages as guest | HTTP 307 to `/login` with the intended `next` path preserved |
| Guest `/api/notifications` | HTTP 401 JSON |
| Guest `/api/help/threads` | HTTP 401 JSON |
| Public album ZIP | HTTP 200, `application/zip`, 5,030,947 bytes in baseline run |
| Public ZIP structure | 24 files, one outer album folder, all files nested, README present |
| Private album ZIP as guest | HTTP 403 JSON; no ZIP bytes returned |
| Public audio assets | 9 of 9 returned HTTP 200 without login redirect |
| Public album SSR image sources sampled | 2 of 2 returned HTTP 200 |
| Locked private album SSR HTML | Request-access copy present; no R2 column names, `.r2.dev` URL, or cloud storage URL detected |
| About SSR HTML | Profile content present; visible `No Image` text not detected |

The in-app browser automation channel did not retain a tab during navigation. HTTP behavior and source-level evidence were recorded, but visual interaction claims are intentionally limited.

## Production Behavioral Reference

Read-only checks against `https://www.orianawren.com` matched the local baseline for `/`, `/albums`, a public album, a locked private album, `/about`, `/contact`, `/profile`, and `/login` (HTTP 200). Guest `/studio` redirected to login with its return path.

No authenticated production mutations were performed.

## Recent-System Verification

### Runtime verified

- Guest notification endpoint remains unauthorized.
- Guest help-thread endpoint remains unauthorized.
- Locked private ZIP download is denied.
- Public album ZIP creation works and preserves one outer album directory.
- Public audio files remain directly accessible.
- Public and locked album routes render without server errors.

### Source reviewed

- Assistant modes are `off`, `quiet`, `helpful`, and `expressive`; default mode is `quiet`.
- Assistant and general UI sound are disabled by default.
- Assistant language resolves from the selected site locale with English fallback.
- Assistant handoff requires an explicit confirmation action before `POST /api/help/threads`.
- User help threads and messages are paginated at 20 records.
- Ten consecutive user help messages are enforced before requiring an admin reply.
- Public admin replies are normalized to `Oriana Wren` with no admin avatar.
- Reduced-motion handling exists in album previews, landing motion, assistant pets, and scroll reveals.
- Media viewer supports Escape, arrow navigation, fullscreen, zoom, and reduced page scrolling while open.

### Not runtime verified in this baseline

- Saving authenticated assistant preferences.
- Authorized private-album rendering and downloads.
- Studio dashboard, Albums, Uploads, Access Requests, and Messages after admin authentication.
- Creating an assistant handoff, replying as admin, and receiving the user notification end to end.
- Notification panel mark-read behavior.
- Visual focus trapping/restoration and complete keyboard-only journeys.
- Mobile and tablet visual layout.

These require an authenticated fixture/session or a stable interactive-browser session. They remain test requirements, not assumed successes.

## Database and Authorization Baseline

- `src/lib/supabase.ts` exports a broad service-role client as the default server client.
- Proxy middleware also creates service-role clients for profile synchronization and audit logging.
- Service-role imports have not yet been classified by trust level.
- RLS policies and supporting indexes exist across migrations but have not yet been tested across the full role matrix.
- Help-thread user reads include `owner_user_id` filtering in application code and exclude internal notes.
- Final authorization confidence requires Milestone 1 inventory and Milestone 3 RLS/API tests.

## R2 and Media Assumptions

The following are code-derived assumptions; bucket policy behavior was not independently verified.

- One R2 client and one configured bucket are used for uploads and reads.
- `getPublicUrl(key)` maps any key to the configured public origin.
- Public derivatives use `albums/{albumId}/images/{mediaId}/...`.
- Protected originals use `private/albums/{albumId}/images/{mediaId}/...` but currently share the same bucket/client.
- Whether the public custom domain exposes the `private/` prefix is a critical unverified production assumption.
- Direct PUT URLs expire after five minutes but do not currently bind checksum or content length.
- Images are synchronously decoded and re-encoded during completion.
- Raw videos receive a public URL and a `pending`/`needs_review` database state without trusted FFprobe/FFmpeg processing.
- ZIP generation fetches URL-based sources and performs synchronous JPEG conversion in the request path.

No R2 objects were moved, copied, modified, or deleted during this baseline.

## Confirmed Baseline Issues

1. `getAlbums` returns sample albums both for an empty database result and for caught database errors.
2. `getAlbum` silently falls back to sample detail data after exceptions.
3. A service-role Supabase client is the broad default for server data access.
4. CSP still contains `unsafe-inline` and `unsafe-eval`, external Google font allowances, wildcard R2 allowances, and duplicate public-origin entries.
5. Root HTML language is statically `en` despite the site language picker.
6. Public pages return `Cache-Control: no-cache, must-revalidate`; public/user-specific cache separation is not yet designed.
7. Private-original object protection depends on unverified bucket/prefix behavior.
8. Video completion trusts browser-supplied metadata and exposes the raw object URL before trusted worker processing.

## Baseline Safety Decision

Milestone 0 changes only engineering documentation and a standalone typecheck script. No schema, authorization, storage path, production data, or user-visible behavior changed.

Architecture changes may proceed only as bounded, reversible subtasks with explicit tests and rollback notes.

