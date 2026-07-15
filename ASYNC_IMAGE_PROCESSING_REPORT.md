# Asynchronous Image Processing Report

## Status

Milestone 6 is `COMPLETE - MIGRATED AND END-TO-END VERIFIED`. Milestone 4 private storage is operational and all processing migrations through `202607150020` are applied remotely.

## Architecture

Image upload requests now reserve a media row and service-role-only processing job, upload the source to private R2 staging, verify the staged object with `HEAD`, and queue it. A trusted cron worker claims bounded batches with `FOR UPDATE SKIP LOCKED`. Lease expiry, deterministic output keys, retry backoff, and atomic completion make jobs safe to retry.

The worker verifies magic bytes and Sharp's decoded format, caps source dimensions and total pixels, normalizes EXIF orientation, re-encodes without metadata, and optionally retains only a parsed capture date. It creates thumbnail, medium, and large WebP derivatives, optional AVIF equivalents, a BlurHash, and a SHA-256 content hash used for duplicate detection.

## State And Publication

The durable lifecycle is `uploaded`, `queued`, `processing`, `ready`, `failed`, `quarantined`, `deleting`, and `deleted`. Public and private RLS policies expose only `ready` rows. The centralized Milestone 5 delivery descriptor also rejects every non-ready state, so failed or incomplete media cannot be selected by cards, the viewer, or downloads.

Private source keys exist only in the service-role job table. Private derivative URL columns contain same-site authenticated gateway routes; browser payloads receive neither staging keys nor permanent private URLs. Public derivatives continue to use immutable public R2 URLs.

## Operations

- `npm run media:reprocess` is dry-run by default; `-- --apply` atomically requeues selected jobs.
- `npm run media:orphan-cleanup` inventories stale sources by default. `-- --apply` only marks reversible `deleting` state and never deletes R2 bytes.
- `npm run media:classify-existing` reports legacy readiness and processing gaps without mutating working media.
- `npm run media:canary` supports controlled setup, verification, idempotency, terminal-failure, and cleanup operations.
- Upload completion schedules a bounded `after()` worker pass; the secret-protected cron route remains the recovery path for retries and expired leases.
- Source and derivative writes use deterministic versioned keys. Canary objects were fully removed after verification.

## Deployment Order

1. Keep `CRON_SECRET` configured in the deployment environment for scheduled recovery calls.
2. Monitor failed/quarantined job counts and invoke dry-run reprocess/orphan reports before mutation.
3. Keep rollback SQL available; it changes database behavior only and does not touch R2.

## Verification

- Magic-byte, decoded-format, orientation, derivative, metadata stripping, BlurHash, hash, AVIF, and dimension tests are automated.
- Static tests verify queue RLS, ready-only publication, private staging, trusted worker authorization, non-destructive cleanup, manifest hygiene, and upload-triggered background processing.
- Remote RLS verification confirms anonymous access to `media_processing_jobs` is denied.
- Existing-media classification: 1,168 ready, 1,165 legacy images eligible for optional reprocessing, zero missing derivatives/failed metadata/quarantined candidates/queued-without-job.
- Canary result: 3 ready, 2 quarantined, 1 retried to terminal failure; private manifest had 6 verified derivatives; idempotent rerun produced zero duplicate jobs; cleanup left zero canary jobs.
- Final repository gate: lint passed with 0 errors and 11 existing warnings, typecheck passed, 59/59 tests passed, and the Next.js 16.2.10 production build generated all 49 static pages.
