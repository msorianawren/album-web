# Pagination Migration Report

## Scope

Migration `202607150100_album_summary_pagination.sql` adds the Milestone 8
query layer: three cursor indexes, one ready-media preview index, and the
`list_album_summaries` RPC. It does not alter existing album rows, media rows,
R2 objects, bucket policies, or RLS policies.

## Release order

1. Apply the migration in Supabase SQL Editor or through the linked migration
   workflow.
2. Confirm the RPC appears in the API schema after the included `pgrst`
   reload notification.
3. Deploy the application commit.
4. Browse public, updating, and private album sections as both an anonymous
   visitor and an authorized account.

The application commit must not be deployed before step 1, because the archive
now depends on the additive RPC.

## Rollback

`supabase/rollbacks/202607150100_album_summary_pagination_rollback.sql` drops
only the new RPC and indexes. It does not delete or rewrite data. Roll back the
application commit first, then run the rollback script only if the new query
layer itself must be removed.

## Acceptance checks

- Manual ordering remains stable across cursor batches.
- A browse request returns one status bucket and no more than the configured
  batch size plus one seek row.
- Each album returns at most four preview items.
- Private unauthorized payloads contain no private media URL or object key.
- Private authorized cards use `/api/media/:id/content` delivery paths.
- Public and private batches are not shared-cacheable.
