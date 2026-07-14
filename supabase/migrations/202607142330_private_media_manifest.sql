-- Additive private-media inventory. This migration never moves or deletes R2 objects.

create table if not exists public.private_media_assets (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  variant text not null
    check (variant in ('thumbnail', 'medium', 'display', 'poster', 'original', 'video')),
  object_key text not null,
  legacy_object_key text not null,
  intended_private_key text not null,
  bucket_role text not null default 'public'
    check (bucket_role in ('public', 'private')),
  mime_type text,
  migration_state text not null default 'discovered'
    check (migration_state in (
      'discovered', 'verified', 'copied', 'cutover_ready', 'active', 'failed', 'rollback_required'
    )),
  checksum text,
  etag text,
  source_size bigint,
  destination_size bigint,
  last_error_code text,
  verified_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (media_id, variant)
);

create index if not exists private_media_assets_album_id_idx
  on public.private_media_assets (album_id);
create index if not exists private_media_assets_media_id_idx
  on public.private_media_assets (media_id);
create index if not exists private_media_assets_object_key_idx
  on public.private_media_assets (object_key);
create index if not exists private_media_assets_migration_state_idx
  on public.private_media_assets (migration_state, bucket_role);

alter table public.private_media_assets enable row level security;
revoke all on table public.private_media_assets from anon, authenticated;
grant all on table public.private_media_assets to service_role;

drop policy if exists "service role manages private media assets" on public.private_media_assets;
create policy "service role manages private media assets"
on public.private_media_assets
for all
to service_role
using (true)
with check (true);

create or replace function public.sync_private_media_asset_inventory(target_media_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.private_media_assets (
    album_id,
    media_id,
    variant,
    object_key,
    legacy_object_key,
    intended_private_key,
    bucket_role,
    mime_type
  )
  select
    m.album_id,
    m.id,
    asset.variant,
    asset.object_key,
    asset.object_key,
    'private/albums/' || m.album_id::text || '/' || m.id::text || '/' || asset.variant || '/' ||
      regexp_replace(asset.object_key, '^.*/', ''),
    'public',
    asset.mime_type
  from public.media m
  join public.albums a on a.id = m.album_id
  cross join lateral (
    values
      ('thumbnail', coalesce(m.thumbnail_r2_key, m.poster_r2_key, m.medium_r2_key, m.public_r2_key, m.r2_key), 'image/webp'),
      ('medium', coalesce(m.medium_r2_key, m.public_r2_key, m.thumbnail_r2_key, m.r2_key), case when m.media_type = 'image' then 'image/webp' else m.mime_type end),
      ('poster', coalesce(m.poster_r2_key, m.thumbnail_r2_key), 'image/webp'),
      ('display', case when m.media_type = 'video' then m.r2_key else coalesce(m.medium_r2_key, m.public_r2_key, m.thumbnail_r2_key, m.r2_key) end, case when m.media_type = 'image' then 'image/webp' else m.mime_type end),
      ('original', coalesce(m.original_private_r2_key, m.r2_key), m.mime_type),
      ('video', case when m.media_type = 'video' then m.r2_key else null end, case when m.media_type = 'video' then m.mime_type else null end)
  ) as asset(variant, object_key, mime_type)
  where m.id = target_media_id
    and a.status = 'private'
    and asset.object_key is not null
    and asset.object_key <> ''
  on conflict (media_id, variant) do update
    set album_id = excluded.album_id,
        object_key = excluded.object_key,
        legacy_object_key = excluded.legacy_object_key,
        intended_private_key = excluded.intended_private_key,
        mime_type = excluded.mime_type,
        updated_at = now()
  where public.private_media_assets.migration_state in ('discovered', 'failed', 'rollback_required')
    and public.private_media_assets.bucket_role = 'public';
end;
$$;

revoke all on function public.sync_private_media_asset_inventory(uuid) from public, anon, authenticated;
grant execute on function public.sync_private_media_asset_inventory(uuid) to service_role;

create or replace function public.sync_private_media_asset_inventory_from_media()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.sync_private_media_asset_inventory(new.id);
  return new;
end;
$$;

create or replace function public.sync_private_media_asset_inventory_from_album()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  candidate record;
begin
  if new.status = 'private' and old.status is distinct from new.status then
    for candidate in select id from public.media where album_id = new.id loop
      perform public.sync_private_media_asset_inventory(candidate.id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_private_media_asset_inventory_media on public.media;
create trigger sync_private_media_asset_inventory_media
after insert or update of r2_key, thumbnail_r2_key, medium_r2_key, poster_r2_key,
  public_r2_key, original_private_r2_key, mime_type
on public.media
for each row execute function public.sync_private_media_asset_inventory_from_media();

drop trigger if exists sync_private_media_asset_inventory_album on public.albums;
create trigger sync_private_media_asset_inventory_album
after update of status on public.albums
for each row execute function public.sync_private_media_asset_inventory_from_album();

do $$
declare
  candidate record;
begin
  for candidate in
    select m.id
    from public.media m
    join public.albums a on a.id = m.album_id
    where a.status = 'private' and m.deleted_at is null
  loop
    perform public.sync_private_media_asset_inventory(candidate.id);
  end loop;
end;
$$;

comment on table public.private_media_assets is
  'Server-only object manifest. Public/discovered rows remain legacy delivery until a verified private copy is explicitly activated.';
