# IMMICH BEHAVIOR MATRIX

**Immich reference**: v3.0.3, `cd308ad`, `D:\Projects\immich-reference`  
**Date**: 2026-07-28  
**Scope**: album-web feat/immich-grade-album-experience

Each row documents an Immich behavior, whether it is adopted, the Oriana equivalent, and the test verifying correct behavior.

---

## Timeline & Grid

| Behavior | Immich Source | Oriana Implementation | Test |
|----------|--------------|----------------------|------|
| Group media by calendar day (UTC) | `timeline-manager.svelte.ts: groupByDate` | `engine.ts: groupMediaByDate` | `timeline-engine.test.mjs: groupMediaByDate` |
| Justified row layout (aspect-ratio preserving) | `layout-support.svelte.ts: updateGeometry` | `engine.ts: computeJustifiedLayout` | `timeline-engine.test.mjs: computeJustifiedLayout` |
| Exact containerWidth row fill (scale rows) | `layout-support.svelte.ts` | `engine.ts` (row width within ±2px) | `produces rows with cells summing to containerWidth` |
| Portrait items narrower than landscape | `layout-support.svelte.ts` | `engine.ts: safeAspectRatio` | `portrait items get narrower cells` |
| Last partial row at natural height (no stretch) | Immich: last row uses naturalWidth < 0.85 threshold | Same threshold (0.85) | `computeJustifiedLayout: single item` |
| Date group header (sticky) | Svelte sticky date labels | `TimelineDateGroup: sticky z-10` | — manual |
| Virtual scroll: only render visible groups | `VirtualScrollManager + intersection-support` | `computeVirtualRange (overscan)` | `computeVirtualRange: includes groups within viewport` |
| Overscan groups (buffer above/below) | `VirtualScrollManager: overscan` | `OVERSCAN=2` | `computeVirtualRange: includes overscan groups` |
| Scroll restoration after viewer close | `gridScrollTarget` in viewer manager | `scrollBeforeViewerRef + requestAnimationFrame` | `media-viewer-machine.test.mjs` (existing) |
| Scroll position persistence | `PersistedLocalStorage` | `sessionStorage via engine.ts scrollRestorationKey` | `scrollRestorationKey` tests |
| Large library (1000 items) bounded DOM | Virtual scroll | Virtual scroll with overscan | `large library (1000 items): virtual range bounded` |

## Scrubber

| Behavior | Immich Source | Oriana Implementation | Test |
|----------|--------------|----------------------|------|
| Month entries from date groups | `timeline-manager.svelte.ts: scrubberMonths` | `engine.ts: computeScrubberEntries` | `computeScrubberEntries: consolidates same-month groups` |
| Single entry per month | Immich | Same | `computeScrubberEntries: separate entries for different months` |
| Top offset of first group in month | Immich | `entry.top = group.top` | `computeScrubberEntries` |
| Drag + pointer capture | `timeline-scrollbar.svelte` | `TimelineScrubber: setPointerCapture` | — manual |
| Click to jump | `timeline-scrollbar.svelte` | `TimelineScrubber: onClick` | — manual |
| Floating month label on hover/drag | Immich | `TimelineScrubber: labelEntry` | — manual |
| Active month highlight | Immich | `activeMonthKey` state | — manual |
| Hidden when ≤1 month | Implicit | `scrubberEntries.length > 1 guard` | — |

## Selection

| Behavior | Immich Source | Oriana Implementation | Test |
|----------|--------------|----------------------|------|
| Toggle individual item | `AssetMultiSelectManager.selectAsset` | `selectionReducer: toggle` | `toggle: adds item on first toggle` |
| Deselect on second toggle | Immich | Same | `toggle: removes item on second toggle` |
| Shift-range selection (anchor to target) | `setAssetSelectionCandidates` | `selectionReducer: expand-range` | `expand-range: selects items between anchor and target` |
| Backwards range (target < anchor) | Immich | `lo/hi = Math.min/max(anchor, target)` | `expand-range: works backwards` |
| Range candidates highlighted | `candidates` set | `rangeCandidateIds` | `expand-range: marks range items as candidates` |
| Previously selected items survive range | Immich | New Set(state.selectedIds) merged | `expand-range: does not deselect previously selected` |
| Select all | `AssetMultiSelectManager.selectAssets` | `selectionReducer: select-all` | `select-all: selects all provided entries` |
| Clear all | `AssetMultiSelectManager.clear` | `selectionReducer: clear` | `clear: resets all state` |
| isActive computed from count > 0 | `selectionActive = $derived(map.size > 0)` | `isActive: next.size > 0` | Multiple tests |
| Long-press to enter selection mode (mobile) | Implicit via touch events | 500ms `longPressTimer` in `MediaThumbnail` | — manual |
| Checkbox overlay when selection active | Immich asset thumbnail checkbox | `MediaThumbnail: isHighlighted ring + checkbox div` | — manual |
| Bulk download selected items | `download-manager.svelte.ts` | `handleBulkDownload: anchor.click() loop` | — |
| Floating action bar | Immich selection bar | `SelectionActionBar` component | — manual |

## Search & Filters

| Behavior | Immich Source | Oriana Implementation | Test |
|----------|--------------|----------------------|------|
| Media type filter (photo/video/all) | `search.svelte.ts` filter chips | `AlbumSearchFilter: mediaType chips` | — manual |
| Orientation filter (landscape/portrait/square) | Immich search filters | `AlbumSearchFilter: orientation chips` | — manual |
| Text search (filename/title) | Immich smart search + filename | `AlbumSearchFilter: matchesFilter` | — manual |
| Clear all filters | Immich `clearAll` | `AlbumSearchFilter: clearAll` | — manual |
| Result count display | Immich | `resultCount useMemo` | — manual |
| Filter panel toggle | Immich | `panelOpen state` | — manual |

## Viewer

| Behavior | Immich Source | Oriana Implementation | Test |
|----------|--------------|----------------------|------|
| Deep-link `?media=<id>` | SvelteKit navigation | `window.history.pushState` + `popstate` listener | `media-viewer-routes.test.mjs` |
| Browser back closes viewer | SvelteKit back | `window.history.back()` + popstate | — manual |
| Scroll restoration on close | `gridScrollTarget` | `scrollBeforeViewerRef + requestAnimationFrame` | — manual |
| Adjacent media prefetch | `asset-viewer-manager.svelte.ts` | `useViewerDelivery` (existing) | `media-viewer-machine.test.mjs` |
| Touch swipe next/prev | Immich gestures | `useViewerGestures` (existing) | `media-viewer-gestures.test.mjs` |
| Pinch-zoom | Immich `@zoom-image/core` | `useViewerGestures: pinch` | `media-viewer-gestures.test.mjs` |

## Privacy (Unchanged, verified)

| Invariant | Verification |
|-----------|-------------|
| Private album access checked server-side | `supabase-private-rls.test.mjs` |
| Immich API key not in client bundle | `perf:privacy` gate |
| Object keys not in client bundle | `perf:privacy` gate |
| Immich asset IDs not in browser | `immich_asset_mapping` RLS denies anon |
| Public album, no auth required | `public-album-access.test.mjs` |

---

## Deferred Behaviors

| Behavior | Reason |
|----------|--------|
| People / Faces | Requires Immich ML backend |
| Smart search (CLIP/CLIP-ViT) | Requires Immich ML backend (`IMMICH_ENABLED=true`) |
| Map view | GPS data not in current schema |
| Memories (on-this-day) | Requires Immich backend |
| Stacks | Future milestone |
| Duplicate detection | Studio-only concern |
| Trash / archive | No trash model in Oriana |
| Motion photo playback | Not in current media pipeline |
