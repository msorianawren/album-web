-- Database-backed album summaries for cursor-based public browsing.
-- This is additive: it does not move media, change RLS policies, or mutate albums.

create index if not exists albums_public_cursor_idx
  on public.albums (coalesce(public_sort_order, 2147483647), created_at desc, id)
  where deleted_at is null and status = 'public';

create index if not exists albums_updating_cursor_idx
  on public.albums (coalesce(updating_sort_order, 2147483647), created_at desc, id)
  where deleted_at is null and status = 'updating';

create index if not exists albums_private_cursor_idx
  on public.albums (coalesce(private_sort_order, 2147483647), created_at desc, id)
  where deleted_at is null and status = 'private';

create index if not exists media_album_preview_cursor_idx
  on public.media (album_id, sort_order, created_at, id)
  where deleted_at is null and processing_status = 'ready';

create or replace function public.list_album_summaries(
  p_status text,
  p_query text default null,
  p_limit integer default 24,
  p_cursor_sort integer default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id text default null
)
returns table (
  id uuid,
  title text,
  slug text,
  description text,
  status text,
  cover_url text,
  cover_media_id uuid,
  safe_preview_url text,
  photo_count integer,
  video_count integer,
  media_count integer,
  like_count integer,
  comment_count integer,
  default_media_sort text,
  public_sort_order integer,
  private_sort_order integer,
  updating_sort_order integer,
  created_at timestamptz,
  updated_at timestamptz,
  access_request_status text,
  preview_items jsonb,
  pagination_sort_order integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with scoped as (
    select
      a.*,
      case a.status
        when 'public' then coalesce(a.public_sort_order, 2147483647)
        when 'updating' then coalesce(a.updating_sort_order, 2147483647)
        when 'private' then coalesce(a.private_sort_order, 2147483647)
      end as list_sort_order,
      case
        when a.status = 'private' then public.private_album_access_decision(a.id)
        else 'ALLOWED_PUBLIC'
      end as access_decision
    from public.albums a
    where a.deleted_at is null
      and a.status = p_status
      and (
        nullif(btrim(p_query), '') is null
        or a.title ilike '%' || btrim(p_query) || '%'
        or coalesce(a.description, '') ilike '%' || btrim(p_query) || '%'
      )
  ),
  paged as (
    select *
    from scoped
    where (
      p_cursor_sort is null
      or p_cursor_created_at is null
      or p_cursor_id is null
      or list_sort_order > p_cursor_sort
      or (
        list_sort_order = p_cursor_sort
        and created_at < p_cursor_created_at
      )
      or (
        list_sort_order = p_cursor_sort
        and created_at = p_cursor_created_at
        and id::text > p_cursor_id
      )
    )
    order by list_sort_order asc, created_at desc, id asc
    limit least(greatest(coalesce(p_limit, 24), 1), 100) + 1
  )
  select
    a.id,
    a.title,
    a.slug,
    a.description,
    a.status,
    case when a.status = 'private' then a.safe_preview_url else a.cover_url end as cover_url,
    a.cover_media_id,
    a.safe_preview_url,
    a.photo_count,
    a.video_count,
    a.media_count,
    a.like_count,
    a.comment_count,
    a.default_media_sort,
    a.public_sort_order,
    a.private_sort_order,
    a.updating_sort_order,
    a.created_at,
    a.updated_at,
    case
      when a.access_decision like 'ALLOWED_%' then 'approved'
      when a.access_decision = 'DENIED_REVOKED' then 'revoked'
      when a.access_decision = 'DENIED_PENDING' then 'pending'
      when a.access_decision = 'DENIED_REJECTED' then 'rejected'
      else null
    end as access_request_status,
    coalesce(previews.items, '[]'::jsonb) as preview_items,
    a.list_sort_order as pagination_sort_order
  from paged a
  left join lateral (
    select jsonb_agg(
      case
        when a.status = 'private' then jsonb_build_object(
          'id', m.id,
          'media_type', m.media_type,
          'title', m.title
        )
        else jsonb_build_object(
          'id', m.id,
          'media_type', m.media_type,
          'title', m.title,
          'url', m.url,
          'thumbnail_url', m.thumbnail_url,
          'medium_url', m.medium_url,
          'poster_url', m.poster_url
        )
      end
      order by m.sort_order asc, m.created_at asc, m.id asc
    ) as items
    from (
      select
        media.id,
        media.media_type,
        media.title,
        media.url,
        media.thumbnail_url,
        media.medium_url,
        media.poster_url,
        media.sort_order,
        media.created_at
      from public.media
      where media.album_id = a.id
        and media.deleted_at is null
        and media.processing_status = 'ready'
        and (
          a.status <> 'private'
          or a.access_decision like 'ALLOWED_%'
        )
      order by media.sort_order asc, media.created_at asc, media.id asc
      limit 4
    ) m
  ) previews on true
  order by a.list_sort_order asc, a.created_at desc, a.id asc;
$$;

revoke all on function public.list_album_summaries(text, text, integer, integer, timestamptz, text) from public;
grant execute on function public.list_album_summaries(text, text, integer, integer, timestamptz, text)
  to anon, authenticated, service_role;

comment on function public.list_album_summaries(text, text, integer, integer, timestamptz, text) is
  'Card-safe cursor pagination with four bounded previews per album. Private previews use media IDs only and require caller authorization.';

notify pgrst, 'reload schema';
