-- Professional album media sorting and safe derived metadata.
-- Run after the base schema. It is additive and keeps existing albums/media.

alter table public.albums
  add column if not exists default_media_sort text not null default 'smart';

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'albums'
      and constraint_name = 'albums_default_media_sort_check'
  ) then
    alter table public.albums
      add constraint albums_default_media_sort_check
      check (
        default_media_sort in (
          'smart',
          'manual',
          'taken_desc',
          'taken_asc',
          'uploaded_desc',
          'uploaded_asc',
          'filename_asc',
          'filename_desc',
          'portrait_first',
          'landscape_first',
          'aspect_group',
          'type',
          'liked_desc',
          'commented_desc',
          'viewed_desc',
          'featured',
          'shuffle'
        )
      );
  end if;
end $$;

alter table public.media
  add column if not exists safe_display_name text,
  add column if not exists uploaded_at timestamptz,
  add column if not exists taken_at timestamptz,
  add column if not exists sort_date timestamptz,
  add column if not exists aspect_ratio numeric,
  add column if not exists orientation text not null default 'unknown',
  add column if not exists file_extension text,
  add column if not exists original_file_size bigint,
  add column if not exists original_mime_type text,
  add column if not exists featured_rank integer not null default 0,
  add column if not exists view_count integer not null default 0,
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists metadata_status text not null default 'fallback',
  add column if not exists processing_status text not null default 'processed';

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'media'
      and constraint_name = 'media_orientation_check'
  ) then
    alter table public.media
      add constraint media_orientation_check
      check (orientation in ('portrait', 'landscape', 'square', 'unknown'));
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'media'
      and constraint_name = 'media_metadata_status_check'
  ) then
    alter table public.media
      add constraint media_metadata_status_check
      check (metadata_status in ('extracted', 'fallback', 'unavailable', 'failed'));
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'media'
      and constraint_name = 'media_processing_status_check'
  ) then
    alter table public.media
      add constraint media_processing_status_check
      check (processing_status in ('processed', 'pending', 'failed'));
  end if;
end $$;

update public.media
set
  safe_display_name = coalesce(
    safe_display_name,
    nullif(regexp_replace(coalesce(original_filename, title, 'Untitled media'), '\.[^.]*$', ''), ''),
    'Untitled media'
  ),
  uploaded_at = coalesce(uploaded_at, created_at, now()),
  sort_date = coalesce(sort_date, taken_at, created_at, now()),
  aspect_ratio = coalesce(
    aspect_ratio,
    case
      when width is not null and height is not null and height > 0
        then round((width::numeric / height::numeric), 6)
      else null
    end
  ),
  orientation = case
    when orientation is not null and orientation <> 'unknown' then orientation
    when width is null or height is null then 'unknown'
    when width = height then 'square'
    when height > width then 'portrait'
    else 'landscape'
  end,
  file_extension = coalesce(
    file_extension,
    lower(nullif(substring(original_filename from '\.([^.]*)$'), '')),
    case
      when mime_type like '%webp%' then 'webp'
      when mime_type like '%jpeg%' then 'jpg'
      when mime_type like '%png%' then 'png'
      when mime_type like '%avif%' then 'avif'
      when mime_type like '%mp4%' then 'mp4'
      else null
    end
  ),
  original_file_size = coalesce(original_file_size, file_size),
  original_mime_type = coalesce(original_mime_type, mime_type),
  metadata_status = coalesce(metadata_status, 'fallback'),
  processing_status = coalesce(processing_status, 'processed')
where safe_display_name is null
   or uploaded_at is null
   or sort_date is null
   or aspect_ratio is null
   or orientation = 'unknown'
   or file_extension is null
   or original_file_size is null
   or original_mime_type is null;

update public.media media_row
set like_count = counts.total
from (
  select media_id, count(*)::integer as total
  from public.likes
  where media_id is not null
  group by media_id
) counts
where media_row.id = counts.media_id;

update public.media media_row
set comment_count = counts.total
from (
  select media_id, count(*)::integer as total
  from public.comments
  where media_id is not null
    and is_hidden = false
  group by media_id
) counts
where media_row.id = counts.media_id;

create index if not exists albums_default_media_sort_idx on public.albums(default_media_sort);
create index if not exists media_album_sort_date_idx on public.media(album_id, sort_date desc);
create index if not exists media_album_uploaded_idx on public.media(album_id, uploaded_at desc);
create index if not exists media_album_filename_idx on public.media(album_id, safe_display_name);
create index if not exists media_album_orientation_idx on public.media(album_id, orientation);
create index if not exists media_album_featured_idx on public.media(album_id, featured_rank desc);
create index if not exists media_album_like_idx on public.media(album_id, like_count desc);
create index if not exists media_album_comment_idx on public.media(album_id, comment_count desc);

create or replace function public.refresh_media_comment_counts()
returns trigger
language plpgsql
as $$
declare
  target_media_id uuid;
begin
  target_media_id = coalesce(new.media_id, old.media_id);

  if target_media_id is not null then
    update public.media
    set comment_count = (
      select count(*)::integer
      from public.comments
      where media_id = target_media_id
        and is_hidden = false
    )
    where id = target_media_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists comments_refresh_media_counts on public.comments;
create trigger comments_refresh_media_counts
after insert or update or delete on public.comments
for each row execute function public.refresh_media_comment_counts();

create or replace function public.refresh_media_like_counts()
returns trigger
language plpgsql
as $$
declare
  target_media_id uuid;
begin
  target_media_id = coalesce(new.media_id, old.media_id);

  if target_media_id is not null then
    update public.media
    set like_count = (
      select count(*)::integer
      from public.likes
      where media_id = target_media_id
    )
    where id = target_media_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists likes_refresh_media_counts on public.likes;
create trigger likes_refresh_media_counts
after insert or update or delete on public.likes
for each row execute function public.refresh_media_like_counts();
