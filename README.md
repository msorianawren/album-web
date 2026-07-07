# Album Web

A production-oriented photo/video album sharing platform built with Next.js 16,
React 19, TypeScript, Tailwind CSS, Supabase Auth/Postgres, Cloudflare R2, and
Vercel.

## Core Rules

- `DEFAULT_OWNER_ID` is the only admin user id.
- Admin checks happen on the server for every mutation route.
- Public viewers can browse album cards, open `public` and `updating` albums,
  comment, like, and download only when album status allows it.
- Private albums expose card-safe metadata only. Public users never receive the
  private media list.

## Environment

Copy `.env.example` to `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

DEFAULT_OWNER_ID=
NEXT_PUBLIC_SITE_URL=
```

Server-only values must never be exposed in client components.

## Database

Run this single migration in Supabase SQL Editor:

```text
supabase/migrations/202607070000_init_album_platform.sql
```

It creates the full app database:

- `albums` with `public | updating | private` status
- `media` for images and videos
- `comments`
- `likes`
- optional `album_share_links`
- indexes, counters, RLS policies, and duplicate-like prevention

If an older bigint/photo-only schema is present, the migration renames it to
legacy tables before creating the UUID media schema.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The public UI falls back to sample albums when Supabase is not ready.

## Admin Login

Create or choose a Supabase Auth user, copy its id into `DEFAULT_OWNER_ID`, then
sign in at:

```text
/login
```

Only that user can access:

```text
/studio
```

## API

All API responses use:

```json
{ "success": true, "data": {} }
```

or:

```json
{ "success": false, "code": "ERROR_CODE", "message": "Human readable message" }
```

Implemented routes:

- `GET /api/albums?q=&status=`
- `POST /api/albums`
- `GET /api/albums/[id-or-slug]`
- `PATCH /api/albums/[id]`
- `DELETE /api/albums/[id]`
- `POST /api/upload`
- `POST /api/upload/url`
- `PATCH /api/media/[id]`
- `DELETE /api/media/[id]`
- `GET /api/comments?albumId=`
- `POST /api/comments`
- `PATCH /api/comments`
- `POST /api/likes`
- `GET /api/search?q=`

## Uploads

Supported images:

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/avif`

Supported videos:

- `video/mp4`
- `video/webm`
- `video/quicktime`

Limits are defined in `src/lib/config.ts`.

Image uploads generate a WebP thumbnail. Video uploads store the original video;
poster generation is marked as a worker TODO in `src/lib/media.ts`.
