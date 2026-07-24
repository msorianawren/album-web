# Rollback Procedures

This document outlines the rollback paths for all major performance and architectural optimizations.

## Phase 2: Client Boundary Reduction
- **Rollback**: Revert `app/albums/[id]/page.tsx` and `app/page.tsx` back to full client components or revert `use client` directives if hydration errors emerge.

## Phase 3: 3D Environment
- **Rollback**: Re-add WebGL and `EnvironmentShell` to the global `layout.tsx` if isolated route integration fails to load properly or causes navigation layout shifts.

## Phase 5: Image Delivery
- **Rollback**: Remove the new processing variants script and fall back to the old 640/1800/3200 default processing sizes in `lib/media/processing.ts`.

## Phase 6: Data and Cache Architecture
- **Rollback**: Re-enable `select("*")` if specific column selections miss required fields. Use `noStore()` universally instead of explicit tags if caching anomalies occur.
