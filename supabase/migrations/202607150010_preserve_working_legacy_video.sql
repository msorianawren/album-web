-- Preserve working legacy videos while the image-only worker is active.
update public.media media_row
set processing_status = 'ready',
    updated_at = now()
where media_row.media_type = 'video'
  and media_row.processing_status = 'queued'
  and coalesce(media_row.r2_key, '') <> ''
  and coalesce(media_row.url, '') <> ''
  and not exists (
    select 1 from public.media_processing_jobs job
    where job.media_id = media_row.id
  );
