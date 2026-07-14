-- Roll back only the additive manifest. R2 objects are never changed by this script.

drop trigger if exists sync_private_media_asset_inventory_album on public.albums;
drop trigger if exists sync_private_media_asset_inventory_media on public.media;
drop function if exists public.sync_private_media_asset_inventory_from_album();
drop function if exists public.sync_private_media_asset_inventory_from_media();
drop function if exists public.sync_private_media_asset_inventory(uuid);
drop table if exists public.private_media_assets;
