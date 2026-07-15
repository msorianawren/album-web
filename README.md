# Album Web

A production-oriented photo and video album platform built with Next.js,
TypeScript, Supabase Auth/Postgres, and Cloudflare R2.

## Repository Layout

- `src/` contains the Next.js application.
- `supabase/migrations/` contains ordered, append-only database migrations.
- `scripts/` contains supported operational tooling.
- `tests/` contains regression tests for delivery, authorization, and media
  processing.
- `docs/` contains architecture, operations, maintenance, and historical
  reports. New engineering documents do not belong in the repository root.

## Local Development

Copy `.env.example` to `.env.local`, set values only on your own machine, then
install and run the application:

```bash
npm ci
npm run dev
```

Run the quality gate before committing:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Server-only values, including Supabase service credentials and R2 credentials,
must never be exposed in client code or committed to Git.

## Environment Contract

The public R2 bucket uses the standard account, access-key, secret-key, bucket,
and public-origin variables. Private media requires a private bucket name and
can use dedicated private access-key and secret-key variables. A private account
identifier is optional when it is the same as the public account.

Production variables are configured in Vercel's Production environment; local
`.env.local` values do not deploy to Vercel. See
[`docs/operations/PRODUCTION_RELEASE_GATE.md`](docs/operations/PRODUCTION_RELEASE_GATE.md)
before promoting a release.

## Authorization

`DEFAULT_OWNER_ID` identifies the founder. Additional application admins use
the server-checked profile role. Private album access, individual delivery, and
downloads are enforced on the server; private object keys and permanent private
URLs must not be sent to browsers.

## Database And Storage

Apply new database changes only through a new migration file. Never modify an
already applied migration or make unrecorded production schema changes. Private
R2 object movement requires inventory, dry-run, copy verification, and rollback
evidence before cutover.

## Production Workflow

Work on a feature branch, run the quality gate, validate a Vercel Preview, then
merge to the protected production branch. Production release and rollback checks
are documented in
[`docs/operations/PRODUCTION_RELEASE_GATE.md`](docs/operations/PRODUCTION_RELEASE_GATE.md).
