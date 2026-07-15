# Query Architecture Report

## Album browse path

The public album archive now reads card summaries through
`public.list_album_summaries`. The function accepts exactly one status bucket
(`public`, `updating`, or `private`) and an opaque seek cursor. The page loads
the three buckets independently; the client asks the existing `/api/albums`
route for the next batch only when a visitor chooses **Load more**.

The cursor is derived from the configured manual ordering column, then
`created_at DESC`, then `id ASC`. This preserves Studio ordering and makes the
last key deterministic when two albums share an order or timestamp.

## Summary projection

The database returns only card fields, maintained album counters, an access
state, and no more than four preview rows per album. The preview query is a
bounded `LATERAL` subquery, rather than a broad media query followed by a
JavaScript slice. Album counters remain the maintained values on `albums`; no
card list loads likes or comments to count them.

For public and updating albums the preview includes public delivery fields.
For private albums, an authorized caller receives media identifiers and the
app converts them to same-site authenticated media-gateway paths. An
unauthorized caller receives no private preview rows and can only receive the
already-safe album preview field. The RPC itself returns no R2 object key or
private media URL.

## Authorization and caching

`list_album_summaries` runs with the caller's `auth.uid()` and asks the
existing private-access decision helper for each private album in the bounded
page. It does not accept a user identifier as input. API responses are marked
`Cache-Control: private, no-store`; personalized private cards are therefore
not placed in a shared cache.

## Scale target

At 500 albums and 10,000 ready media rows, one browse batch reads at most 97
album summaries and at most 384 preview rows when the migration limit is 96.
The status-specific cursor indexes support the ordered seek, while the media
preview index supports the four-row lateral lookup per returned album. Before
raising the page-size ceiling, run `EXPLAIN (ANALYZE, BUFFERS)` against a
representative copy of production data.
