-- Album Web database bootstrap
-- Run this file in Supabase SQL Editor to create the full app database.
-- Do not run exported Supabase auth.* schema files; Supabase manages auth itself.

create extension if not exists pgcrypto;

-- Compatibility guard: if a previous photo-only bigint schema exists, preserve it
-- as legacy data before creating the UUID media platform schema.
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

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  provider text not null default 'google',
  is_blocked boolean not null default false,
  blocked_reason text,
  blocked_at timestamptz,
  blocked_by uuid references auth.users(id),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  path text,
  method text,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
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

create index if not exists comments_album_created_idx
  on public.comments(album_id, created_at desc);

create index if not exists likes_album_id_idx on public.likes(album_id);
create index if not exists likes_media_id_idx on public.likes(media_id);
create index if not exists user_profiles_email_idx on public.user_profiles(email);
create index if not exists user_profiles_is_blocked_idx on public.user_profiles(is_blocked);
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_user_id, created_at desc);
create index if not exists audit_logs_action_created_idx on public.audit_logs(action, created_at desc);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

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

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
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
      select count(*)::integer
      from public.media
      where album_id = target_album_id
        and media_type = 'image'
    ),
    video_count = (
      select count(*)::integer
      from public.media
      where album_id = target_album_id
        and media_type = 'video'
    ),
    media_count = (
      select count(*)::integer
      from public.media
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
alter table public.user_profiles enable row level security;
alter table public.audit_logs enable row level security;

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
      select 1
      from public.albums
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
    is_hidden = false
    and exists (
      select 1
      from public.albums
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
      select 1
      from public.albums
      where albums.id = comments.album_id
        and albums.status in ('public', 'updating')
    )
  );

drop policy if exists "Admin manages comments" on public.comments;
create policy "Admin manages comments"
  on public.comments for all
  to authenticated
  using (
    exists (
      select 1
      from public.albums
      where albums.id = comments.album_id
        and albums.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.albums
      where albums.id = comments.album_id
        and albums.owner_id = (select auth.uid())
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

drop policy if exists "Admin manages likes" on public.likes;
create policy "Admin manages likes"
  on public.likes for all
  to authenticated
  using (
    coalesce(
      (
        select owner_id
        from public.albums
        where albums.id = likes.album_id
      ),
      (
        select albums.owner_id
        from public.media
        join public.albums on albums.id = media.album_id
        where media.id = likes.media_id
      )
    ) = (select auth.uid())
  );

drop policy if exists "Admin manages share links" on public.album_share_links;
create policy "Admin manages share links"
  on public.album_share_links for all
  to authenticated
  using (
    exists (
      select 1
      from public.albums
      where albums.id = album_share_links.album_id
        and albums.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.albums
      where albums.id = album_share_links.album_id
        and albums.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users read own profile" on public.user_profiles;
create policy "Users read own profile"
  on public.user_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "No direct client profile writes" on public.user_profiles;
create policy "No direct client profile writes"
  on public.user_profiles for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists "No direct client audit access" on public.audit_logs;
create policy "No direct client audit access"
  on public.audit_logs for all
  to authenticated
  using (false)
  with check (false);
