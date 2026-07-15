-- Application rollback only. R2 objects are intentionally untouched.

drop policy if exists "Public read public and updating media" on public.media;
create policy "Public read public and updating media"
on public.media for select to anon, authenticated
using (exists (
  select 1 from public.albums
  where albums.id = media.album_id and albums.status in ('public', 'updating')
));

drop policy if exists "Authorized users read granted private media" on public.media;
create policy "Authorized users read granted private media"
on public.media for select to authenticated
using (public.can_access_private_album(album_id));

update public.media set processing_status = 'processed' where processing_status = 'ready';
update public.media set processing_status = 'pending' where processing_status in ('uploaded', 'queued', 'processing');
update public.media set processing_status = 'failed' where processing_status in ('quarantined', 'deleting', 'deleted');
alter table public.media drop constraint if exists media_processing_status_check;
alter table public.media
  alter column processing_status set default 'processed',
  add constraint media_processing_status_check check (processing_status in ('processed', 'pending', 'failed'));

drop function if exists public.claim_media_processing_jobs(text,integer);
drop function if exists public.complete_media_processing_job(uuid,text,jsonb);
drop function if exists public.fail_media_processing_job(uuid,text,text,boolean);
drop function if exists public.requeue_media_processing_job(uuid);
drop function if exists public.mark_media_processing_orphan(uuid);
drop function if exists public.queue_media_processing_upload(uuid);
drop function if exists public.register_media_processing_upload(uuid,uuid,text,text,text,bigint,text);
drop function if exists public.get_album_storage_bytes(uuid);
drop table if exists public.media_processing_jobs;

-- New nullable media/settings columns are retained so rollback remains data preserving.
