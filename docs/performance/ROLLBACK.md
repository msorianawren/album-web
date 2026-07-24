# Rollback Procedures

This document outlines the rollback paths for all major performance and architectural optimizations.

## Phase 2: Client Boundary Reduction
- **Rollback**: Revert `app/albums/[id]/page.tsx` and `app/page.tsx` back to full client components or revert `use client` directives if hydration errors emerge.

## Phase 3: 3D Environment
- **Rollback**: Re-add WebGL and `EnvironmentShell` to the global `layout.tsx` if isolated route integration fails to load properly or causes navigation layout shifts.

## Phase 5: Image Delivery
- **Rollback**: Existing v2 objects remain readable. Revert the v3 widths in `src/lib/media/image-processing-core.ts` and `PROCESSING_VERSION` in `src/lib/media/image-processing.ts`; do not delete v2 or v3 R2 objects until the media records have been verified. Run `npm run media:orphan-cleanup` without `--apply` before any cleanup.

## Phase 6: Data and Cache Architecture
- **Rollback**: Keep the explicit column lists and add a missing field if a contract changes. If public cache behavior is stale, replace the affected `unstable_cache` wrapper with `noStore()`; never cache sessions, authorization decisions, or Feather balances.

## Phase 8: Performance Gates
- **Rollback**: Adjust a budget only after recording a verified production baseline. Do not remove the private-media leak gate or server-only dependency gate to make CI pass.
