# Album Web

A premium minimal photo gallery built with Next.js 16 App Router, Supabase
Postgres/Auth, and Cloudflare R2.

## Stack

- Next.js 16 App Router with Server Components by default
- Tailwind CSS v4 design tokens in `src/app/globals.css`
- Supabase for album/image metadata and RLS
- Cloudflare R2 for original, thumbnail, and medium image variants
- Sharp and BlurHash for upload processing

## Environment

Copy `.env.example` to `.env.local` and fill the values.

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DEFAULT_OWNER_ID=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` and R2 secret keys must remain server-only. Do not
expose them in client components.

## Database

Apply the migration in:

```text
supabase/migrations/202607070001_create_album_schema.sql
```

It creates:

- `albums`
- `images`
- indexes and counters
- `updated_at` trigger
- RLS policies for public albums and owner-only private data

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The UI falls back to sample albums when Supabase is not ready, so the gallery can
still be reviewed before applying the database migration.

## API

- `GET /api/albums`
- `POST /api/albums`
- `GET /api/albums/[id]`
- `PUT /api/albums/[id]`
- `DELETE /api/albums/[id]`
- `GET /api/albums/[id]/images`
- `POST /api/albums/[id]/images`
- `DELETE /api/albums/[id]/images/[imageId]`
- `POST /api/upload/url`

Uploads accept `jpg`, `jpeg`, `png`, `webp`, `heic`, and `avif` up to 50MB.
The server creates original, thumb, and medium variants in R2.

## Design Notes

The UI follows a photo-first, premium minimal gallery direction:

- minimal chrome
- high whitespace
- responsive masonry gallery
- accessible focus states
- keyboard lightbox controls
- loading and error states per route
