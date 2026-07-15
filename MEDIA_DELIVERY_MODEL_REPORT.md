# Media Delivery Model Report

## Status

Milestone 5 is complete at the application layer and locally verified. Milestone 4 remains `IN_PROGRESS - IMPLEMENTED_NOT_MIGRATED`; this delivery model does not claim that legacy private R2 objects are no longer public.

## Root Cause

Media URL selection was duplicated across album cards, the viewer, Studio, upload summaries, cover updates, single downloads, and ZIP exports. Most call sites selected one value with a local `thumbnail_url ?? medium_url ?? url` expression. A stale first derivative, an authenticated same-site URL, an optimizer restriction, or an HTML login response therefore produced inconsistent behavior and sometimes a browser broken-image state.

## Source Of Truth

`getMediaDeliveryDescriptor(media, context)` in `src/lib/media/delivery.ts` now owns:

| Output | Purpose |
| --- | --- |
| `publicCard` | Public-card derivative candidates only |
| `authorizedPrivateCard` | Authenticated private gateway candidates only |
| `card` | Authorization-aware selected card source |
| `viewer` | Full viewer source and ordered fallback candidates |
| `download` | Processed download source candidates |
| `originalDownload` | Original source only when explicitly allowed |
| `safePreview` | Explicit safe-preview URL only; normal thumbnails are never inferred safe |
| `placeholder` | Intentional local placeholder |
| `downloadHref` | Same-site guarded download endpoint |
| state/dimensions | Authorization, processing, MIME, width, height, and aspect ratio |

Public image fallback order is thumbnail, poster when present, medium, then display. Viewer order is medium, display, then thumbnail. Private media uses the same policy only after the server has projected authorized same-site gateway URLs. Unauthorized private descriptors return only an explicit safe preview or the placeholder and contain no download source.

## Reliable Rendering

`ReliableMediaImage` tries descriptor candidates in order, keeps the image transparent until it loads, and renders an intentional unavailable state after exhaustion. It never leaves a native broken-image icon or prints raw alt text as the visible error. Known dimensions are supplied to the viewer and stable aspect ratios are supplied to cards.

The shared renderer is used by:

- public and private album cards
- animated album previews and album headers
- locked safe-preview covers
- media grid cards and viewer thumbnails
- full-size viewer images
- Studio album/media/upload previews

Videos use descriptor viewer/poster sources and replace failed playback with an intentional unavailable state.

## URL And Response Handling

- Spaces and Unicode paths are encoded once through the URL parser.
- Existing percent encoding and signed query values are preserved.
- Protocol-relative, control-character, and non-HTTP URLs are rejected.
- Same-site authenticated media routes, signed URLs, R2, Supabase, and unknown optimizer hosts bypass the Next.js optimizer.
- Public single and ZIP downloads retry ordered candidates.
- Download fetches accept only the expected `image/*` or `video/*` response and reject HTML/JSON login or error pages.
- Successful responses use the upstream media MIME and keep `nosniff` on single downloads.

## Security Boundaries

- The descriptor does not grant access; server-side JWT/RLS and private gateway authorization remain authoritative.
- Safe previews must be explicitly supplied as safe previews.
- Browser download links remain same-site API routes.
- Private object keys and permanent private URLs remain excluded from browser payloads.
- Private ZIP and single downloads still reauthorize every media item before reading bytes.

## Verification

- Unit/static tests: 54/54 pass.
- Lint: pass with 0 errors and 11 existing warnings.
- TypeScript: pass.
- Production build: pass; 48 static generation units completed.
- Local HTTP smoke: `/albums`, `/api/albums`, and a public album detail returned 200; guest private gateway probing returned 404.

## Remaining External Risk

Milestone 4 migration-history reconciliation, private bucket provisioning, object copy/cutover, live authorization fixtures, and old public-path blocking remain external work. The delivery model is compatible with both the current gateway fallback and the future active private manifest source.
