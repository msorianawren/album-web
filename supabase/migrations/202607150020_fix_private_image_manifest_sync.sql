-- Keep image-processing manifests limited to verified delivery variants.
create or replace function public.sync_private_media_asset_inventory(target_media_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.private_media_assets (
    album_id, media_id, variant, object_key, legacy_object_key,
    intended_private_key, bucket_role, mime_type
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
      ('thumbnail', coalesce(m.thumbnail_r2_key, m.medium_r2_key, m.public_r2_key, m.r2_key), 'image/webp'),
      ('medium', coalesce(m.medium_r2_key, m.public_r2_key, m.thumbnail_r2_key, m.r2_key), case when m.media_type = 'image' then 'image/webp' else m.mime_type end),
      ('poster', case when m.media_type = 'video' then coalesce(m.poster_r2_key, m.thumbnail_r2_key) else null end, 'image/webp'),
      ('display', case when m.media_type = 'video' then m.r2_key else coalesce(m.large_r2_key, m.medium_r2_key, m.public_r2_key, m.thumbnail_r2_key, m.r2_key) end, case when m.media_type = 'image' then 'image/webp' else m.mime_type end),
      ('original', m.original_private_r2_key, m.mime_type),
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

delete from public.private_media_assets manifest
using public.media media_row
where manifest.media_id = media_row.id
  and media_row.media_type = 'image'
  and manifest.variant in ('poster', 'original')
  and manifest.bucket_role = 'public'
  and manifest.migration_state = 'discovered';
