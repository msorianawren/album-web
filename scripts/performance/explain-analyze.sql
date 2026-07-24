-- Run in Supabase SQL Editor against a production-like dataset.
-- Read-only: this file creates, changes, and drops nothing.

explain (analyze, buffers, verbose, format text)
select id, title, slug, status, cover_url, photo_count, video_count, media_count
from public.albums
where deleted_at is null and status = 'public'
order by coalesce(public_sort_order, 2147483647), created_at desc, id
limit 25;

explain (analyze, buffers, verbose, format text)
select id, album_id, media_type, thumbnail_url, medium_url, width, height, sort_order
from public.media
where album_id = (
  select id from public.albums where deleted_at is null order by media_count desc limit 1
)
  and deleted_at is null
  and processing_status in ('ready', 'processed', 'uploaded', 'processing')
order by sort_order, created_at
limit 61;

explain (analyze, buffers, verbose, format text)
select media_id
from public.likes
where media_id in (
  select id from public.media where deleted_at is null order by created_at desc limit 60
);

explain (analyze, buffers, verbose, format text)
select media_id
from public.comments
where media_id in (
  select id from public.media where deleted_at is null order by created_at desc limit 60
)
  and is_hidden = false
  and deleted_at is null;

-- Inspect candidates only. Never drop an index from this report without a
-- representative EXPLAIN plan and a rollback statement.
select
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
from pg_stat_user_indexes
where schemaname = 'public'
order by idx_scan asc, pg_relation_size(indexrelid) desc;
