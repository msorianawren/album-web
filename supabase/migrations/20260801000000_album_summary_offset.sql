create function public.list_album_page(
  p_status text,
  p_query text default null,
  p_limit integer default 24,
  p_offset integer default 0
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
  feather_purchase_enabled boolean,
  feather_price integer,
  effective_feather_price integer,
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
    order by list_sort_order asc, created_at desc, id asc
    limit least(greatest(coalesce(p_limit, 24), 1), 100)
    offset p_offset
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
    a.feather_purchase_enabled,
    a.feather_price,
    case
      when a.status = 'private' and a.feather_purchase_enabled
        then coalesce(a.feather_price, settings.private_album_default_feather_price)
      else null
    end as effective_feather_price,
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
  cross join lateral (
    select coalesce(
      (select private_album_default_feather_price from public.site_settings where id = 'default'),
      150
    ) as private_album_default_feather_price
  ) settings
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
        and (a.status <> 'private' or a.access_decision like 'ALLOWED_%')
      order by media.sort_order asc, media.created_at asc, media.id asc
      limit 4
    ) m
  ) previews on true
  order by a.list_sort_order asc, a.created_at desc, a.id asc;
$$;

revoke all on function public.list_album_page(text, text, integer, integer) from public;
grant execute on function public.list_album_page(text, text, integer, integer) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
