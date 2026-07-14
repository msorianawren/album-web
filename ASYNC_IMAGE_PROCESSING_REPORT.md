# Asynchronous Image Processing Report

## Status

Milestone 6 is implemented and locally verified but its additive migration has not been applied. Milestone 4 remains `IN_PROGRESS - IMPLEMENTED_NOT_MIGRATED` and is still a runtime prerequisite for private-bucket delivery.

## Architecture

Image upload requests now reserve a media row and service-role-only processing job, upload the source to private R2 staging, verify the staged object with `HEAD`, and queue it. A trusted cron worker claims bounded batches with `FOR UPDATE SKIP LOCKED`. Lease expiry, deterministic output keys, retry backoff, and atomic completion make jobs safe to retry.

The worker verifies magic bytes and Sharp's decoded format, caps source dimensions and total pixels, normalizes EXIF orientation, re-encodes without metadata, and optionally retains only a parsed capture date. It creates thumbnail, medium, and large WebP derivatives, optional AVIF equivalents, a BlurHash, and a SHA-256 content hash used for duplicate detection.

## State And Publication

The durable lifecycle is `uploaded`, `queued`, `processing`, `ready`, `failed`, `quarantined`, `deleting`, and `deleted`. Public and private RLS policies expose only `ready` rows. The centralized Milestone 5 delivery descriptor also rejects every non-ready state, so failed or incomplete media cannot be selected by cards, the viewer, or downloads.

Private source keys exist only in the service-role job table. Private derivative URL columns contain same-site authenticated gateway routes; browser payloads receive neither staging keys nor permanent private URLs. Public derivatives continue to use immutable public R2 URLs.

## Operations

- `npm run media:reprocess` is dry-run by default; `-- --apply` atomically requeues selected jobs.
- `npm run media:orphan-cleanup` inventories stale sources by default. `-- --apply` only marks reversible `deleting` state and never deletes R2 bytes.
- Source and derivative writes use deterministic versioned keys. This milestone performs no production copy, move, or delete.

## Deployment Order

1. Complete the Milestone 4 private bucket and manifest prerequisites.
2. Apply `202607150000_async_image_processing.sql`.
3. Configure the trusted worker schedule for `/api/cron/process-media`.
4. Run one bounded image through staging, processing, public/private delivery, retry, and quarantine checks.
5. Keep the rollback SQL available; it changes database behavior only and does not touch R2.

## Verification

- Magic-byte, decoded-format, orientation, derivative, metadata stripping, BlurHash, hash, AVIF, and dimension tests are automated.
- Static tests verify queue RLS, ready-only publication, private staging, trusted worker authorization, and non-destructive cleanup.
- Lint passes with 0 errors and 11 existing warnings; typecheck passes; 58/58 tests pass; the Next.js 16.2.10 production build passes with 49 static pages generated.
