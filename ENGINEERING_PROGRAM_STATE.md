# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-15
- Repository branch: `engineering/production-platform-overhaul`
- Latest verified checkpoint: `28049a7 feat(media): add asynchronous image processing pipeline` (push pending at time of record)
- Current milestone: Milestone 6 - Asynchronous image processing (`IMPLEMENTED_NOT_MIGRATED`); Milestone 4 remains independently `IN_PROGRESS - IMPLEMENTED_NOT_MIGRATED`
- Current subtask: Verify the additive queue migration and bounded worker flow after Milestone 4 private-bucket prerequisites are available
- Completed milestones: Milestone 0, Milestone 1, Milestone 2, Milestone 3, and Milestone 5
- Files changed in current checkpoint: async upload reservation/completion, trusted image worker, processing core, R2 role-aware writes/HEAD, state-gated delivery, settings, operations, tests, and report
- Migrations created: prior migrations plus additive async image processing (`202607150000`) with rollback
- Migrations applied locally: No - the CLI is available, but linked remote history drift makes replay unsafe and no disposable local database is configured
- Migrations applied remotely: `202607141000_unified_help_chat.sql`, `202607141830_private_album_rls.sql`, and `202607142115_user_help_write_rpcs.sql` reported successful by the user; not independently role-tested from this workspace
- Commands already run: prior milestone checks; Milestone 5 full gate; Milestone 6 incremental lint, typecheck, and processor/architecture tests
- Lint result: PASS WITH WARNINGS - 0 errors, 11 existing warnings
- Typecheck result: PASS
- Test result: PASS - 58/58 including real Sharp processing, EXIF orientation, metadata stripping, WebP/AVIF derivatives, magic/decoded format checks, state gating, queue security, and prior regression coverage
- Build result: PASS - Next.js 16.2.10 compiled all routes and generated 49 static pages including the trusted media worker route
- Known failures: Inventory verified that all 1,830 legacy private-media variants remain publicly retrievable through the configured public R2 domain
- Unresolved blockers: `db push --dry-run` would replay 27 older migration files; `R2_PRIVATE_BUCKET_NAME` is not configured; production-equivalent role fixtures remain unavailable
- Exact next action: Complete the Milestone 6 full gate and push the checkpoint; do not apply `202607150000` before the Milestone 4 manifest/private-bucket dependency is ready
- Inspect first: `ASYNC_IMAGE_PROCESSING_REPORT.md`, `src/lib/media/image-processing-core.ts`, `src/lib/media/processing-jobs.ts`, and `supabase/migrations/202607150000_async_image_processing.sql`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
