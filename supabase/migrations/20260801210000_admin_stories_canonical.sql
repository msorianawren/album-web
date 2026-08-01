begin;

create table if not exists public.admin_stories (
  id uuid primary key default gen_random_uuid(),
  video_url text not null,
  poster_url text not null,
  title text,
  is_available boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_stories
  add column if not exists title text,
  add column if not exists is_available boolean not null default true,
  add column if not exists video_r2_key text,
  add column if not exists poster_r2_key text,
  add column if not exists caption text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists duration_seconds numeric,
  add column if not exists is_published boolean,
  add column if not exists sort_order integer;

update public.admin_stories stories
set
  video_r2_key = coalesce(stories.video_r2_key, substring(stories.video_url from '^https://media\.orianawren\.com/(landing/stories/.+)$')),
  poster_r2_key = coalesce(stories.poster_r2_key, substring(stories.poster_url from '^https://media\.orianawren\.com/(landing/stories/.+)$')),
  caption = coalesce(stories.caption, stories.title),
  is_published = coalesce(stories.is_published, stories.is_available, false),
  sort_order = coalesce(stories.sort_order, ordered.position - 1)
from (
  select id, row_number() over (order by created_at, id) as position
  from public.admin_stories
) ordered
where stories.id = ordered.id;

alter table public.admin_stories
  alter column is_published set default false,
  alter column is_published set not null,
  alter column sort_order set default 0,
  alter column sort_order set not null,
  add constraint admin_stories_video_r2_key_format check (video_r2_key is null or video_r2_key ~ '^landing/stories/[0-9a-f-]{36}/video\.(mp4|webm)$'),
  add constraint admin_stories_poster_r2_key_format check (poster_r2_key is null or poster_r2_key ~ '^landing/stories/[0-9a-f-]{36}/poster\.webp$'),
  add constraint admin_stories_video_url_match check (video_r2_key is null or video_url = 'https://media.orianawren.com/' || video_r2_key),
  add constraint admin_stories_poster_url_match check (poster_r2_key is null or poster_url = 'https://media.orianawren.com/' || poster_r2_key),
  add constraint admin_stories_mime_type_check check (mime_type is null or mime_type in ('video/mp4', 'video/webm')),
  add constraint admin_stories_file_size_check check (file_size is null or file_size >= 0),
  add constraint admin_stories_width_check check (width is null or width > 0),
  add constraint admin_stories_height_check check (height is null or height > 0),
  add constraint admin_stories_duration_check check (duration_seconds is null or duration_seconds >= 0),
  add constraint admin_stories_sort_order_check check (sort_order >= 0),
  add constraint admin_stories_portrait_ratio_check check (width is null or height is null or abs((width::numeric / height::numeric) - 0.5625) <= 0.028125),
  add constraint admin_stories_caption_check check (caption is null or char_length(caption) <= 300);

create unique index if not exists admin_stories_video_r2_key_idx on public.admin_stories (video_r2_key) where video_r2_key is not null;
create unique index if not exists admin_stories_poster_r2_key_idx on public.admin_stories (poster_r2_key) where poster_r2_key is not null;
create index if not exists admin_stories_published_order_idx on public.admin_stories (is_published, sort_order, created_at);

create or replace function public.validate_new_admin_story()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.video_r2_key is null
     or new.poster_r2_key is null
     or new.mime_type is null
     or new.file_size is null
     or new.width is null
     or new.height is null
     or new.duration_seconds is null then
    raise exception 'New admin stories require canonical media keys and metadata';
  end if;
  return new;
end;
$$;

drop trigger if exists admin_stories_validate_new on public.admin_stories;
create trigger admin_stories_validate_new
  before insert on public.admin_stories
  for each row execute function public.validate_new_admin_story();

alter table public.admin_stories enable row level security;
drop policy if exists "Admin stories are viewable by everyone" on public.admin_stories;
drop policy if exists "Admins can manage stories" on public.admin_stories;
drop policy if exists "Published admin stories are public" on public.admin_stories;
create policy "Published admin stories are public"
  on public.admin_stories
  for select
  to anon, authenticated
  using (is_published = true);

revoke insert, update, delete, truncate, references, trigger on table public.admin_stories from anon, authenticated;
grant select on table public.admin_stories to anon, authenticated;
grant all on table public.admin_stories to service_role;

alter table public.landing_page_settings
  add column if not exists admin_stories_settings jsonb not null default '{"enabled":false,"eyebrow":"Behind the scenes","heading":"Founder Stories"}'::jsonb;
alter table public.landing_page_settings
  alter column admin_stories_settings set default '{"enabled":false,"eyebrow":"Behind the scenes","heading":"Founder Stories"}'::jsonb;

update public.landing_page_settings
set admin_stories_settings = jsonb_build_object(
  'enabled', lower(coalesce(admin_stories_settings->>'enabled', 'false')) = 'true',
  'eyebrow', coalesce(nullif(btrim(admin_stories_settings->>'eyebrow'), ''), 'Behind the scenes'),
  'heading', coalesce(nullif(btrim(admin_stories_settings->>'heading'), ''), 'Founder Stories')
)
where id = 'home';

create or replace function public.reorder_admin_stories(story_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplied_count integer := coalesce(cardinality(story_ids), 0);
  existing_count integer;
  matched_count integer;
begin
  select count(*) into existing_count from public.admin_stories;
  select count(*) into matched_count from public.admin_stories where id = any(coalesce(story_ids, array[]::uuid[]));
  if supplied_count <> existing_count or matched_count <> existing_count then
    raise exception 'The reorder list must contain every story exactly once';
  end if;
  update public.admin_stories stories
  set sort_order = ordered.position - 1
  from unnest(story_ids) with ordinality as ordered(id, position)
  where stories.id = ordered.id;
end;
$$;

revoke all on function public.reorder_admin_stories(uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_admin_stories(uuid[]) to service_role;
revoke all on function public.validate_new_admin_story() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
