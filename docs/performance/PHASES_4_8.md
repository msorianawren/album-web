# Performance Phases 4-8

## Implemented

- Album cards render one cover at rest. Living previews activate on fine-pointer hover or keyboard focus and use a three-preview global concurrency limit.
- Album media grids render an initial batch, append near the viewport, retain masonry, and use safe CSS containment.
- Media placeholders decode stored BlurHash values on demand.
- New image jobs write versioned 480, 1440, and 2560 pixel WebP derivatives, with optional AVIF, immutable public caching, and private `no-store`. Existing derivatives remain valid.
- Album metadata and media reads are separate and use explicit columns. Public landing, settings, and featured albums use tagged caches; authorization, sessions, and Feather balances do not.
- Album and upload mutations invalidate `albums:public` and `album:{id}:media`.
- CI checks route bundle budgets, server-only packages in client chunks, public artifacts for private-media leaks, and public query shapes.

## Operations

- Run `scripts/performance/explain-analyze.sql` in Supabase against production-like data and retain the plans before changing indexes.
- Run orphan cleanup in dry-run mode first: `npm run media:orphan-cleanup`.
- Run the local gate after a production build: `npm run perf:gate`.
- Run Lighthouse separately: `npm run perf:lighthouse`.

## Targets

- LCP under 2.5 seconds.
- INP under 200 milliseconds.
- CLS under 0.1.
- Home and Albums client JavaScript 30% below the recorded pre-refactor baseline.
- Supabase query count 40% below the recorded pre-refactor baseline.
