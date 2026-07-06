create extension if not exists pgcrypto;

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
  id bigint generated always as identity primary key,
  owner_id uuid references auth.users(id) not null,
  title text not null,
  slug text unique not null,
  description text,
  cover_image text,
  is_public boolean not null default true,
  photo_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint albums_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.images (
  id bigint generated always as identity primary key,
  album_id bigint not null references public.albums(id) on delete cascade,
  file_name text not null,
  width integer,
  height integer,
  file_size integer,
  content_type text,
  blur_hash text,
  exif_data jsonb,
  original_key text,
  medium_key text,
  thumb_key text,
  file_url text,
  created_at timestamptz not null default now()
);

create index if not exists albums_owner_id_idx on public.albums(owner_id);
create index if not exists albums_slug_idx on public.albums(slug);
create index if not exists images_album_id_idx on public.images(album_id);
create unique index if not exists images_album_file_name_idx
  on public.images(album_id, file_name);

drop trigger if exists albums_set_updated_at on public.albums;
create trigger albums_set_updated_at
before update on public.albums
for each row execute function public.set_updated_at();

create or replace function public.refresh_album_photo_count()
returns trigger
language plpgsql
as $$
declare
  target_album_id bigint;
begin
  target_album_id = coalesce(new.album_id, old.album_id);

  update public.albums
  set photo_count = (
    select count(*)::integer
    from public.images
    where album_id = target_album_id
  )
  where id = target_album_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists images_refresh_album_photo_count on public.images;
create trigger images_refresh_album_photo_count
after insert or update or delete on public.images
for each row execute function public.refresh_album_photo_count();

alter table public.albums enable row level security;
alter table public.images enable row level security;

drop policy if exists "Public albums visible to anyone" on public.albums;
create policy "Public albums visible to anyone"
  on public.albums for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Users can view own albums" on public.albums;
create policy "Users can view own albums"
  on public.albums for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create albums" on public.albums;
create policy "Users can create albums"
  on public.albums for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update own albums" on public.albums;
create policy "Users can update own albums"
  on public.albums for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete own albums" on public.albums;
create policy "Users can delete own albums"
  on public.albums for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Public images from public albums" on public.images;
create policy "Public images from public albums"
  on public.images for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.albums a
      where a.id = images.album_id
        and a.is_public = true
    )
  );

drop policy if exists "Users can view own images" on public.images;
create policy "Users can view own images"
  on public.images for select
  to authenticated
  using (
    (select auth.uid()) = (
      select owner_id
      from public.albums
      where public.albums.id = images.album_id
    )
  );

drop policy if exists "Users can insert images into own albums" on public.images;
create policy "Users can insert images into own albums"
  on public.images for insert
  to authenticated
  with check (
    (select auth.uid()) = (
      select owner_id
      from public.albums
      where public.albums.id = images.album_id
    )
  );

drop policy if exists "Users can update own images" on public.images;
create policy "Users can update own images"
  on public.images for update
  to authenticated
  using (
    (select auth.uid()) = (
      select owner_id
      from public.albums
      where public.albums.id = images.album_id
    )
  )
  with check (
    (select auth.uid()) = (
      select owner_id
      from public.albums
      where public.albums.id = images.album_id
    )
  );

drop policy if exists "Users can delete own images" on public.images;
create policy "Users can delete own images"
  on public.images for delete
  to authenticated
  using (
    (select auth.uid()) = (
      select owner_id
      from public.albums
      where public.albums.id = images.album_id
    )
  );
