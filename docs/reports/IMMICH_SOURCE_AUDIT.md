# IMMICH SOURCE AUDIT

**Reference**: Immich v3.0.3, tag `v3.0.3`, commit `cd308ad`, released 2026-07-15  
**License**: AGPL-3.0 (see `D:\Projects\immich-reference\LICENSE`)  
**Web framework**: SvelteKit / Svelte 5 (runes-based reactivity)  
**OpenAPI**: `open-api/immich-openapi-specs.json`  
**Reference location**: `D:\Projects\immich-reference`  

---

## Source Files Inspected

| Subsystem | Immich Source Files |
|-----------|---------------------|
| Timeline manager | `web/src/lib/managers/timeline-manager/timeline-manager.svelte.ts` |
| Timeline day | `web/src/lib/managers/timeline-manager/timeline-day.svelte.ts` |
| Timeline month | `web/src/lib/managers/timeline-manager/timeline-month.svelte.ts` |
| Timeline types | `web/src/lib/managers/timeline-manager/types.ts` |
| Layout support | `web/src/lib/managers/timeline-manager/internal/layout-support.svelte.ts` |
| Intersection support | `web/src/lib/managers/timeline-manager/internal/intersection-support.svelte.ts` |
| Load support | `web/src/lib/managers/timeline-manager/internal/load-support.svelte.ts` |
| Search support | `web/src/lib/managers/timeline-manager/internal/search-support.svelte.ts` |
| WebSocket support | `web/src/lib/managers/timeline-manager/internal/websocket-support.svelte.ts` |
| Group insertion cache | `web/src/lib/managers/timeline-manager/group-insertion-cache.svelte.ts` |
| Virtual scroll | `web/src/lib/managers/VirtualScrollManager/VirtualScrollManager.svelte.ts` |
| Asset viewer | `web/src/lib/managers/asset-viewer-manager.svelte.ts` |
| Multi-select | `web/src/lib/managers/asset-multi-select-manager.svelte.ts` |
| Stores | `web/src/lib/stores/*.ts` |
| Timeline spec | `web/src/lib/managers/timeline-manager/timeline-manager.svelte.spec.ts` |
| Multi-select spec | `web/src/lib/managers/asset-multi-select-manager.svelte.spec.ts` |

---

## Subsystem Audit Table

| Subsystem | Behavior Discovered | Edge Cases Handled | Oriana Equivalent | Oriana Weakness | Decision | Legal Classification | Milestone |
|-----------|--------------------|--------------------|-------------------|-----------------|----------|---------------------|-----------|
| **Timeline grouping** | Time-bucket API → month objects → day objects; `scrubberMonths` derived from month objects. | Empty buckets, missing assets, pagination holes, asset insert/remove without scroll jump | `MediaGrid.tsx` (none; CSS columns, no grouping) | No date grouping; full flat grid | **Partial**: browser grouping uses the explicit `Asia/Ho_Chi_Minh` public-album timezone with vi/en labels; server time buckets and cursor pagination remain open | Behavioral reimplementation in React | M2 partial |
| **Justified row layout** | `layout-support.svelte.ts`: fills rows greedily using aspect ratio × target height, scales last row if close enough to container width | Portrait/landscape mixing, single-item rows, very tall/wide extremes, resize | CSS `columns` masonry | Uneven masonry; CLS on load | **Adopt** | Behavioral reimplementation | M2 ✅ |
| **Virtual scroll** | `VirtualScrollManager` extends with a scroll controller; `updateTimelineMonthViewportProximity` tracks which months are visible; only near-viewport months render DOM | Large libraries, fast scroll, history navigation | IntersectionObserver batch reveal (appends DOM) | Unbounded DOM growth | **Partial**: group DOM is virtualized against native document scrolling, but the server payload is still bounded rather than cursor/time-bucket streamed | Behavioral reimplementation | M2 partial |
| **Scrubber** | `scrubberMonths: ScrubberMonth[]` derived from layout. Immich uses drag+pointer-capture on a vertical track, emits `scrollTop` to the scrollable container | Fast drag, click, overshooting, single-month case | None | No scrubber | **Adopt** | Behavioral reimplementation | M2 ✅ |
| **Scroll restoration** | `isScrollingOnLoad` flag + `gridScrollTarget` in viewer manager; stores `assetId` in query param and restores position via timeline search | Forward/back navigation, popstate, viewer open/close | `useAlbumViewMemory` (stores album viewed state, not scroll offset) | Viewer close loses scroll position | **Adopt** | Behavioral reimplementation | M2/M3 ✅ |
| **Asset viewer** | `asset-viewer-manager.svelte.ts`: separate `isViewing`, `asset`, `zoomState`, `gridScrollTarget`; history via SvelteKit navigation | Deep links, browser back, prefetch adjacent, zoom reset on navigate | `MediaViewer.tsx` (good; zoom, pan, filmstrip, prefetch) | Scroll restoration missing | **Adapt** | Keep existing, add scroll restoration | M3 |
| **Selection** | `AssetMultiSelectManager`: SvelteMap for O(1) selection, Shift-range via `startAsset` + candidates, group selection via `selectedGroup` Set | Virtualized rows, range across days, select-all, clear on navigate | None in public view | No selection | **Adopt** | Behavioral reimplementation | M4 |
| **Search** | Smart search (ML), OCR, people, location, camera, tags, filename, date range, favorites; all paginated; filter chips | Empty results, unauthorized assets filtered server-side, pagination | None | No search | **Partial**: local title/filename/type/orientation filtering over the already-loaded album payload only. This is not smart search. | M5 partial |
| **Cinematic slideshow** | `slideshow.store.ts`: `SlideshowHistory`, pace options, fullscreen; `cinematicDrift` equivalent not found | Hidden page, video assets, pace reset | Oriana's `cinematicDrift` + `slideshowPace` + `useViewerMachine` | — | **Keep Oriana** (already superior for public-facing) | — |
| **Environmental effects** | No equivalent in Immich | — | Wind chimes, WebGL env, particles | Needs suspension during heavy scroll | **Keep Oriana** + add suspension | M2/M8 |
| **People/Faces** | `face.svelte.ts`, clustering via ML backend | Face bounding boxes, hidden people | None | No face data | **Defer** | Requires Immich ML server | M6+ |
| **Map** | `geolocation.manager.svelte.ts`; Leaflet or Mapbox integration | Privacy, GPS precision | None | No GPS in schema | **Defer** | GPS data not available in current schema | M6+ |
| **Memories** | `memory-manager.svelte.ts`: on-this-day lookups, year-ago | Date range query | None | No memories feature | **Defer** | Requires Immich backend | M6+ |
| **Stacks** | Stack indicator in asset grid, expand/collapse | Thumbnail selection for cover | None | No stacks | **Defer** | M6 |
| **Duplicates** | Server-side hash comparison, UI to resolve | Soft delete, skip | None | No duplicate UI | **Defer** | Studio only | M6+ |
| **Admin features** | Job monitoring, user management, trash, folders | — | Studio | — | **Reject** for public; Studio handles separately | — |

---

## Post-Release Upstream Fixes Ported

None intentionally ported from `main` beyond `v3.0.3`.

---

## Legal / Source-Use Classification

All Immich behavior adopted in this PR is a **behavioral reimplementation in React/TypeScript**:
- No Svelte components, stores, CSS, or copyrightable code sections copied.
- Algorithms (justified layout, virtual range) were re-derived from reading behavior descriptions and re-implementing them independently.
- Immich AGPL-3.0 obligations are not triggered by behavioral observation.
- Attribution preserved in engineering documentation (this file and source comments referencing exact file paths and version).

If future work requires direct code reuse (e.g., a utility function), that section must be isolated, attributed with SPDX header, and AGPL implications documented before proceeding.
