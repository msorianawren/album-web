# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-15
- Repository branch: `engineering/production-platform-overhaul`
- Latest verified checkpoint: `f7ffc036e40db1a76e851fd32f6f5df3d2dffde7` (feature branch pushed; production not deployed)
- Current milestone: Milestone 6 - Asynchronous image processing (`IMPLEMENTED_NOT_MIGRATED`); Milestone 4 remains independently `IN_PROGRESS - IMPLEMENTED_NOT_MIGRATED`
- Current subtask: Provision and configure the non-public R2 bucket, then perform the checkpointed Milestone 4 copy-only migration
- Completed milestones: Milestone 0, Milestone 1, Milestone 2, Milestone 3, and Milestone 5
- Files changed in current checkpoint: async upload reservation/completion, trusted image worker, processing core, R2 role-aware writes/HEAD, state-gated delivery, settings, operations, tests, and report
- Migrations created: prior migrations plus additive async image processing (`202607150000`) with rollback
- Migrations applied locally: No disposable local database is configured
- Migrations applied remotely: migration history is reconciled through `202607142330_private_media_manifest.sql`; the linked dry-run now proposes only the unapplied Milestone 6 migration `202607150000_async_image_processing.sql`
- Commands already run: linked target verification; migration list/history reconciliation; safe push dry-run; private-media inventory; manifest dry-run and idempotent 1,830-row backfill; R2 copy dry-run
- Lint result: PASS WITH WARNINGS - 0 errors, 11 existing warnings
- Typecheck result: PASS
- Test result: PASS - 58/58 including real Sharp processing, EXIF orientation, metadata stripping, WebP/AVIF derivatives, magic/decoded format checks, state gating, queue security, and prior regression coverage
- Build result: PASS - Next.js 16.2.10 compiled all routes and generated 49 static pages including the trusted media worker route
- Known failures: Inventory verified that all 1,830 legacy private-media variants remain publicly retrievable through the configured public R2 domain
- Unresolved blockers: `R2_PRIVATE_BUCKET_NAME` is not configured and the current bucket-scoped R2 credentials cannot list or provision a second bucket; production-equivalent role fixtures remain unavailable
- Exact next action: Provision a non-public R2 bucket, configure `R2_PRIVATE_BUCKET_NAME` outside source control, then rerun the copy dry-run and copy-only migration; do not apply `202607150000` first
- Inspect first: `ASYNC_IMAGE_PROCESSING_REPORT.md`, `src/lib/media/image-processing-core.ts`, `src/lib/media/processing-jobs.ts`, and `supabase/migrations/202607150000_async_image_processing.sql`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
