# Error Semantics Report

- Status: COMPLETE
- Milestone: 2
- Implementation date: 2026-07-14

## Objective

Remove implicit production demo success states and give database, schema, authentication, authorization, storage, processing, and unexpected failures distinct safe contracts.

## Implemented Contract

`src/lib/app-failure.ts` defines:

| Code | HTTP status | Retryable | Public meaning |
|---|---:|---|---|
| `AUTHENTICATION_FAILED` | 401 | no | Sign in again |
| `AUTHORIZATION_FAILED` | 403 | no | Permission denied |
| `DATABASE_UNAVAILABLE` | 503 | yes | Gallery data temporarily unavailable |
| `DATABASE_SCHEMA_MISMATCH` | 503 | no | Data update/deployment mismatch |
| `STORAGE_UNAVAILABLE` | 503 | yes | Media storage temporarily unavailable |
| `PROCESSING_FAILED` | 422 | no | Media could not be processed safely |
| `UNEXPECTED_FAILURE` | 500 | no | Generic safe server failure |

Each `AppFailure` contains:

- a safe code and public message;
- operation name;
- generated or validated request ID;
- retryability;
- HTTP status;
- optional short provider code;
- private cause that is never serialized or written to the structured log.

## Structured Logging

`reportAppFailure()` emits one JSON event per failure with only:

- level/event;
- request ID;
- failure code;
- operation;
- retryability;
- short provider code.

It deliberately omits raw error messages, SQL text, object keys, URLs, query strings, tokens, cookies, message bodies, and user contact data. Re-reporting the same failure instance is suppressed.

All 5xx responses produced through `apiError` now receive a request ID and structured event. `toServerError` preserves a typed failure or creates `UNEXPECTED_FAILURE`; it no longer mislabels arbitrary upload/auth/logic exceptions as database outages.

## Demo Fixture Isolation

- `src/lib/demo-fixtures.ts` contains the explicit code policy.
- Album fixtures default to `disabled` in both production and normal local development.
- The only opt-in value is `local_demo`; there is no environment-error fallback.
- `src/lib/albums.ts` dynamically imports `sample-data.ts` only after that explicit policy is enabled.
- A database exception never returns fixtures under the default policy.

## Album Repository Behavior

| Condition | Previous behavior | New behavior |
|---|---|---|
| Album query returns zero rows | Sample albums | Empty array |
| Album detail has no row | Sample match or null | True null/not found |
| Album list database failure | Sample albums | Structured typed failure |
| Album detail database failure | Sample detail or null | Structured typed failure |
| Preview query failure | Partial albums without previews | Structured typed failure |
| Explicit local demo policy | Implicit/error-driven | Intentional fixture result only |

Core album list, search, detail, and media-list APIs catch typed repository failures and return safe JSON with request ID. Public pages use existing Next.js error boundaries and provide a retry control plus a safe digest reference when available.

## Storage and Processing Behavior

- R2 put, get, delete, and presign failures are normalized to `STORAGE_UNAVAILABLE`.
- Empty R2 response bodies are treated as storage failures.
- Image decode/metadata/resize/re-encode failures are normalized to `PROCESSING_FAILED`.
- Existing R2 failures retain their storage category when encountered inside image processing.
- Media cards render intentional processing and failed/rejected states.
- Pending/failed/rejected media is excluded from viewer navigation, preventing blank slides.

## User-Facing States

- Loading: existing route and interactive loading states remain.
- Empty: album and media grids show intentional empty content.
- Unavailable: page error boundaries show safe temporary-failure copy and Retry.
- Permission denied: locked album and API forbidden states remain separate from outages.
- Processing: media card explains secure processing is still running.
- Permanently failed/rejected: media card explains the item needs administrator review/retry.
- Not found: album APIs and pages preserve 404/null semantics.

## Validation

- Unit tests: 8 passed.
- Tests cover fixture default/explicit opt-in, request IDs, schema classification, authz vs availability, empty vs error, generic errors, storage vs processing, and log redaction/report-once behavior.
- TypeScript: pass.
- ESLint: 0 errors; 14 unchanged baseline warnings.
- Production build: pass; 49 routes generated.
- Local HTTP smoke checks:
  - `/albums`: 200
  - `/api/albums`: 200
  - `/api/search?q=Between`: 200
  - missing album detail: 404
  - missing album media list: 404
  - database result contained 50 real albums and zero `sample-*` IDs
- In-app visual browser verification: BLOCKED_EXTERNAL because the browser webview did not attach a test tab. HTTP and source verification were used; no visual result is claimed.

## Compatibility and Rollback

- No schema or data migration is required.
- Public URLs and response success envelopes are preserved.
- Error responses gain `requestId`; clients that ignore unknown fields remain compatible.
- Rollback is a single commit revert. Sample fixtures remain in the repository and can be restored without data migration.

## Remaining Risks

- Existing route-specific null/error swallowing outside the album/R2/image paths will be migrated incrementally as their boundaries are refactored.
- Page error digests are generated by Next.js and are not guaranteed to equal the application request ID logged by a server repository. API request IDs are correlated directly.
- Video processing remains pending until the trusted worker milestone; this change only makes current failure categories explicit.
- Automated browser/error-injection integration tests will be expanded in Milestone 15.
