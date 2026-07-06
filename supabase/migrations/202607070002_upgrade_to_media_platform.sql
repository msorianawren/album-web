create extension if not exists pgcrypto;

do $$
declare
  album_id_type text;
begin
  select data_type into album_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'albums'
    and column_name = 'id';

  if album_id_type is not null and album_id_type <> 'uuid' then
    alter table if exists public.images rename to images_legacy;
    alter table if exists public.albums rename to albums_legacy;
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  title text not null,
  slug text unique not null,
  description text,
  status text not null default 'public',
  cover_url text,
  cover_media_id uuid,
  photo_count integer not null default 0,
  video_count integer not null default 0,
  media_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint albums_status_check check (status in ('public', 'updating', 'private')),
  constraint albums_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  media_type text not null,
  title text,
  description text,
  r2_key text not null,
  thumbnail_r2_key text,
  poster_r2_key text,
  url text not null,
  thumbnail_url text,
  poster_url text,
  width integer,
  height integer,
  duration_seconds numeric,
  file_size bigint,
  mime_type text,
  original_filename text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_type_check check (media_type in ('image', 'video'))
);

alter table public.albums
  drop constraint if exists albums_cover_media_fk;

alter table public.albums
  add constraint albums_cover_media_fk
  foreign key (cover_media_id) references public.media(id) on delete set null;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  media_id uuid references public.media(id) on delete cascade,
  author_name text,
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.albums(id) on delete cascade,
  media_id uuid references public.media(id) on delete cascade,
  client_id text,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint likes_target_check check (album_id is not null or media_id is not null)
);

create table if not exists public.album_share_links (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists albums_slug_idx on public.albums(slug);
create index if not exists albums_status_idx on public.albums(status);
create index if not exists albums_owner_id_idx on public.albums(owner_id);
create index if not exists albums_created_at_idx on public.albums(created_at desc);
create index if not exists media_album_id_idx on public.media(album_id);
create index if not exists media_media_type_idx on public.media(media_type);
create index if not exists media_sort_order_idx on public.media(sort_order);
create index if not exists media_created_at_idx on public.media(created_at desc);
create index if not exists comments_album_created_idx on public.comments(album_id, created_at desc);
create index if not exists likes_album_id_idx on public.likes(album_id);
create index if not exists likes_media_id_idx on public.likes(media_id);
create unique index if not exists likes_client_album_unique
  on public.likes(client_id, album_id)
  where client_id is not null and album_id is not null;
create unique index if not exists likes_client_media_unique
  on public.likes(client_id, media_id)
  where client_id is not null and media_id is not null;

drop trigger if exists albums_set_updated_at on public.albums;
create trigger albums_set_updated_at
before update on public.albums
for each row execute function public.set_updated_at();

drop trigger if exists media_set_updated_at on public.media;
create trigger media_set_updated_at
before update on public.media
for each row execute function public.set_updated_at();

create or replace function public.refresh_album_media_counts()
returns trigger
language plpgsql
as $$
declare
  target_album_id uuid;
begin
  target_album_id = coalesce(new.album_id, old.album_id);

  update public.albums
  set
    photo_count = (
      select count(*)::integer from public.media
      where album_id = target_album_id and media_type = 'image'
    ),
    video_count = (
      select count(*)::integer from public.media
      where album_id = target_album_id and media_type = 'video'
    ),
    media_count = (
      select count(*)::integer from public.media
      where album_id = target_album_id
    )
  where id = target_album_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists media_refresh_album_counts on public.media;
create trigger media_refresh_album_counts
after insert or update or delete on public.media
for each row execute function public.refresh_album_media_counts();

alter table public.albums enable row level security;
alter table public.media enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.album_share_links enable row level security;

drop policy if exists "Public read card-safe albums" on public.albums;
create policy "Public read card-safe albums"
  on public.albums for select
  to anon, authenticated
  using (status in ('public', 'updating', 'private'));

drop policy if exists "Admin manages albums" on public.albums;
create policy "Admin manages albums"
  on public.albums for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Public read public and updating media" on public.media;
create policy "Public read public and updating media"
  on public.media for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.albums
      where albums.id = media.album_id
        and albums.status in ('public', 'updating')
    )
  );

drop policy if exists "Admin manages media" on public.media;
create policy "Admin manages media"
  on public.media for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Public read visible comments" on public.comments;
create policy "Public read visible comments"
  on public.comments for select
  to anon, authenticated
  using (
    is_hidden = false and exists (
      select 1 from public.albums
      where albums.id = comments.album_id
        and albums.status in ('public', 'updating')
    )
  );

drop policy if exists "Public create comments" on public.comments;
create policy "Public create comments"
  on public.comments for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.albums
      where albums.id = comments.album_id
        and albums.status in ('public', 'updating')
    )
  );

drop policy if exists "Public create likes" on public.likes;
create policy "Public create likes"
  on public.likes for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public read likes" on public.likes;
create policy "Public read likes"
  on public.likes for select
  to anon, authenticated
  using (true);
