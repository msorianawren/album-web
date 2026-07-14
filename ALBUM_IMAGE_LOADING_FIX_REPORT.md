# Album Image Loading Fix Report

## Root cause

Album images stored in Cloudflare R2 were valid, but public album cards and album detail image cards rendered them through Next image optimization. Production returned:

- Status: `402`
- Content type: `text/plain; charset=utf-8`
- Body: `Payment required / OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`
- Failed path shape: `/_next/image?url=<r2-public-url>&w=640&q=75`

Direct R2 requests for `Between Stations` thumbnails, medium images, and public images returned `200` with `image/webp`.

## Affected fields

The grid used `thumbnail_url -> poster_url -> medium_url -> url`.

The viewer already used larger media and was less exposed because it used unoptimized images.

The public album list and album detail header also used R2-backed previews through `next/image`, so they were vulnerable to the same optimizer quota failure.

## Encoding

The uploaded source filename `train (1).jpeg` is not used directly in the public URL. Stored media URLs point to generated R2 keys such as `thumb.webp`, `medium.webp`, and `public.webp`, so spaces/parentheses were not the active failure.

## Fix

- Added `src/lib/media/display-url.ts` as a central display URL helper.
- Media cards, viewer thumbnails, album cards, album headers, and locked album covers now use a shared fallback chain.
- R2/Supabase media URLs bypass Next image optimization only at the image instance level via `unoptimized`.
- No global image optimization disable was added.
- Media cards now show a soft `Image unavailable` fallback instead of a raw browser broken-image icon if a URL still fails.

## Security

- No `.env` files were edited.
- No service role keys, signed URLs, access tokens, refresh tokens, or session data were exposed.
- Private album access checks were not moved client-side or weakened.
- The fix only changes display URL selection and rendering behavior for media already returned by existing server-side album access logic.

## Performance

- Album grids still prefer thumbnails before medium/original URLs.
- Viewer uses larger media only for the opened item.
- Lazy-loading behavior remains intact.
- The fix avoids repeated failed optimizer requests in production.

## Verification

- `Between Stations` database check: 23 active photo rows found.
- R2 direct checks for sample `train` media: thumbnail, medium, and public image URLs returned `200 image/webp`.
- Production optimizer check for `train (1)` thumbnail returned `402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`, confirming the root cause.
- Local `/albums` browser check: album preview images now render as direct R2 URLs, not `/_next/image`, and visible `Between Stations` images load with real dimensions.
- `npm run lint`: passed with existing warnings only.
- `npm run build`: passed.

## Remaining risks

Local album detail UI could not be fully opened without a Google login session, because the route correctly redirects unauthenticated users to `/login`. The same fixed components are used by the album detail grid/header, and the direct R2/object checks confirm the media source itself is healthy.
