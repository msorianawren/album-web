# Engineering Program State

- Status: IN_PROGRESS
- Updated: 2026-07-15
- Repository branch: `main`
- Latest verified checkpoint: `d1402e2c3e411752fc7e802ff7c1443d92fe14cc` (feature checkpoint), merged by `2db71d902a393bfe1286bd48a92277575808a8dd`
- Current milestone: Milestones 0-6 complete; Milestone 7 remains intentionally unstarted
- Current subtask: Verify the production deployment and scheduled recovery configuration after the `main` push
- Completed milestones: Milestone 0, Milestone 1, Milestone 2, Milestone 3, Milestone 4, Milestone 5, and Milestone 6
- Files changed in current checkpoint: async upload reservation/completion, trusted image worker, processing core, R2 role-aware writes/HEAD, state-gated delivery, settings, operations, tests, and report
- Migrations created: prior migrations plus async processing and compatibility fixes through `202607150020`, each with a data-preserving rollback
- Migrations applied locally: No disposable local database is configured
- Migrations applied remotely: migration history is reconciled and applied through `202607150020_fix_private_image_manifest_sync.sql`
- Commands already run: Milestone 4 cutover/rollback; Milestone 6 classification, public/private/EXIF/invalid/oversized/missing-source canaries, retry exhaustion, idempotent reprocess, cleanup, and operations dry-runs
- Lint result: PASS WITH WARNINGS - 0 errors, 11 existing warnings
- Typecheck result: PASS
- Test result: PASS - 59/59 including real Sharp processing, EXIF orientation, metadata stripping, WebP/AVIF derivatives, magic/decoded format checks, state gating, queue security, and prior regression coverage
- Build result: PASS - Next.js 16.2.10 compiled all routes and generated 49 static pages including the trusted media worker route
- Known failures: None in the Milestone 4 storage migration; final retirement verification found zero legacy private sources reachable through the public domain/cache
- Unresolved blockers: None for merge. Vercel `CRON_SECRET` remains an external deployment setting; upload-triggered background processing is operational without it and the scheduled route remains fail-closed when the secret is absent.
- Exact next action: Verify the remote `main` hash, Vercel deployment result, and production `CRON_SECRET` configuration.
- Inspect first: `ASYNC_IMAGE_PROCESSING_REPORT.md`, `src/lib/media/image-processing-core.ts`, `src/lib/media/processing-jobs.ts`, and `supabase/migrations/202607150000_async_image_processing.sql`

## Program Rules

- Preserve production URLs, data, authentication, access history, conversations, and Studio content.
- Do not edit environment files or expose credentials, tokens, private object keys, signed URLs, or founder identity.
- Do not begin architecture changes until Milestone 0 is recorded, verified, and committed.
- Use backward-compatible migrations, isolated commits, and explicit rollback paths.
