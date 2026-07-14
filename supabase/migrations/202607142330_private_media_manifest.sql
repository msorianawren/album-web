-- Additive inventory for private media delivery. This migration does not move or delete R2 objects.

create table if not exists public.private_media_assets (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  variant text not null check (variant in ('thumbnail', 'medium', 'poster', 'display', 'original')),
  object_key text not null,
  bucket_role text not null default 'public' check (bucket_role in ('public', 'private')),
  mime_type text,
  migration_state text not null default 'inventory'
    check (migration_state in ('inventory', 'copied', 'verified', 'active', 'rollback')),
  checksum text,
  source_size bigint,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (media_id, variant)
);

create index if not exists private_media_assets_media_id_idx
  on public.private_media_assets (media_id);
create index if not exists private_media_assets_migration_state_idx
  on public.private_media_assets (migration_state, bucket_role);

alter table public.private_media_assets enable row level security;
revoke all on table public.private_media_assets from anon, authenticated;
grant all on table public.private_media_assets to service_role;

create or replace function public.sync_private_media_asset_inventory(target_media_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.private_media_assets (media_id, variant, object_key, bucket_role, mime_type)
  select m.id, asset.variant, asset.object_key, 'public', asset.mime_type
  from public.media m
  join public.albums a on a.id = m.album_id
  cross join lateral (
    values
      ('thumbnail', coalesce(m.thumbnail_r2_key, m.poster_r2_key, m.medium_r2_key, m.public_r2_key, m.r2_key), 'image/webp'),
      ('medium', coalesce(m.medium_r2_key, m.public_r2_key, m.thumbnail_r2_key, m.r2_key), case when m.media_type = 'image' then 'image/webp' else m.mime_type end),
      ('poster', coalesce(m.poster_r2_key, m.thumbnail_r2_key), 'image/webp'),
      ('display', case when m.media_type = 'video' then m.r2_key else coalesce(m.medium_r2_key, m.public_r2_key, m.thumbnail_r2_key, m.r2_key) end, case when m.media_type = 'image' then 'image/webp' else m.mime_type end),
      ('original', coalesce(m.original_private_r2_key, m.r2_key), m.mime_type)
  ) as asset(variant, object_key, mime_type)
  where m.id = target_media_id
    and a.status = 'private'
    and asset.object_key is not null
    and asset.object_key <> ''
  on conflict (media_id, variant) do update
    set object_key = excluded.object_key,
        mime_type = excluded.mime_type,
        updated_at = now()
  where public.private_media_assets.migration_state in ('inventory', 'rollback');
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
  'Server-only private media object manifest. inventory/public rows are not private at origin until copied, verified, and activated.';
