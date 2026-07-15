-- Additive asynchronous image-processing queue. This migration does not move or delete R2 objects.

alter table public.site_settings
  add column if not exists max_image_dimension integer not null default 20000,
  add column if not exists preserve_image_capture_date boolean not null default false,
  add column if not exists generate_avif_derivatives boolean not null default false;

alter table public.site_settings
  drop constraint if exists site_settings_max_image_dimension_check,
  add constraint site_settings_max_image_dimension_check
    check (max_image_dimension between 1024 and 50000);

alter table public.media
  add column if not exists content_hash text,
  add column if not exists duplicate_of_media_id uuid references public.media(id) on delete set null,
  add column if not exists blurhash text,
  add column if not exists large_r2_key text,
  add column if not exists large_url text,
  add column if not exists avif_thumbnail_r2_key text,
  add column if not exists avif_medium_r2_key text,
  add column if not exists avif_large_r2_key text,
  add column if not exists processing_version integer not null default 1,
  add column if not exists processed_at timestamptz;

alter table public.media drop constraint if exists media_processing_status_check;
update public.media set processing_status = 'ready' where processing_status = 'processed';
update public.media set processing_status = 'queued' where processing_status = 'pending';
alter table public.media
  alter column processing_status set default 'ready',
  add constraint media_processing_status_check check (processing_status in (
    'uploaded', 'queued', 'processing', 'ready', 'failed', 'quarantined',
    'deleting', 'deleted'
  ));

create index if not exists media_content_hash_idx
  on public.media(content_hash) where content_hash is not null;
create index if not exists media_processing_queue_idx
  on public.media(processing_status, updated_at)
  where processing_status in ('uploaded', 'queued', 'processing', 'failed');

create table if not exists public.media_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null unique references public.media(id) on delete cascade,
  album_id uuid not null references public.albums(id) on delete cascade,
  source_bucket_role text not null default 'private' check (source_bucket_role = 'private'),
  source_object_key text not null,
  source_mime_type text not null,
  source_filename text not null,
  source_size bigint not null check (source_size > 0),
  idempotency_key text not null unique,
  state text not null default 'uploaded' check (state in (
    'uploaded', 'queued', 'processing', 'ready', 'failed', 'quarantined',
    'deleting', 'deleted'
  )),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 4 check (max_attempts between 1 and 12),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  checkpoint jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists media_processing_jobs_claim_idx
  on public.media_processing_jobs(state, available_at, created_at)
  where state in ('queued', 'processing');

alter table public.media_processing_jobs enable row level security;
revoke all on table public.media_processing_jobs from anon, authenticated;
grant all on table public.media_processing_jobs to service_role;

drop policy if exists "service role manages media processing jobs" on public.media_processing_jobs;
create policy "service role manages media processing jobs"
on public.media_processing_jobs for all to service_role
using (true) with check (true);

create or replace function public.register_media_processing_upload(
  target_media_id uuid,
  target_album_id uuid,
  source_key text,
  source_mime text,
  source_name text,
  source_bytes bigint,
  target_idempotency_key text
)
returns public.media_processing_jobs
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  album_row public.albums;
  job_row public.media_processing_jobs;
begin
  if source_key !~ '^staging/media/[0-9a-f-]{36}/source\.[a-z0-9]+$'
     or source_mime not in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
     or length(source_name) < 1 or length(source_name) > 255 or source_bytes <= 0 then
    raise exception 'invalid media upload reservation' using errcode = '22023';
  end if;

  select * into album_row from public.albums where id = target_album_id and deleted_at is null;
  if album_row.id is null then raise exception 'album not found' using errcode = 'P0002'; end if;

  insert into public.media (
    id, album_id, owner_id, media_type, title, r2_key, url, file_size,
    mime_type, original_filename, safe_display_name, uploaded_at, sort_date,
    original_file_size, original_mime_type, metadata_status, processing_status,
    security_status, security_notes, metadata_stripped
  ) values (
    target_media_id, target_album_id, album_row.owner_id,
    case when source_mime like 'image/%' then 'image' else 'video' end,
    left(regexp_replace(source_name, '\.[^.]+$', ''), 160), '', '', source_bytes,
    source_mime, source_name, left(regexp_replace(source_name, '\.[^.]+$', ''), 160),
    now(), now(), source_bytes, source_mime, 'unavailable', 'uploaded',
    'needs_review', 'Awaiting trusted asynchronous processing.', false
  ) on conflict (id) do nothing;

  insert into public.media_processing_jobs (
    media_id, album_id, source_object_key, source_mime_type, source_filename,
    source_size, idempotency_key
  ) values (
    target_media_id, target_album_id, source_key, source_mime, source_name,
    source_bytes, target_idempotency_key
  ) on conflict (idempotency_key) do update set updated_at = now()
  returning * into job_row;

  return job_row;
end;
$$;

create or replace function public.get_album_storage_bytes(target_album_id uuid)
returns bigint
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(sum(coalesce(original_file_size, file_size, 0)), 0)::bigint
  from public.media where album_id = target_album_id and processing_status <> 'deleted';
$$;

create or replace function public.queue_media_processing_upload(target_media_id uuid)
returns public.media_processing_jobs
language plpgsql security definer set search_path = public, pg_temp
as $$
declare job_row public.media_processing_jobs;
begin
  update public.media_processing_jobs
  set state = 'queued', available_at = now(), locked_at = null, locked_by = null,
      last_error_code = null, updated_at = now()
  where media_id = target_media_id and state in ('uploaded', 'failed', 'quarantined')
  returning * into job_row;
  if job_row.id is null then
    select * into job_row from public.media_processing_jobs where media_id = target_media_id;
  end if;
  update public.media set processing_status = 'queued', updated_at = now()
  where id = target_media_id and processing_status in ('uploaded', 'failed', 'quarantined');
  return job_row;
end;
$$;

create or replace function public.claim_media_processing_jobs(worker_id text, batch_size integer default 2)
returns setof public.media_processing_jobs
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select id from public.media_processing_jobs
    where (
      state = 'queued' and available_at <= now()
    ) or (
      state = 'processing' and locked_at < now() - interval '15 minutes'
    )
    order by available_at, created_at
    for update skip locked
    limit greatest(1, least(batch_size, 10))
  )
  update public.media_processing_jobs jobs
  set state = 'processing', attempt_count = jobs.attempt_count + 1,
      locked_at = now(), locked_by = left(worker_id, 120), updated_at = now()
  from candidates where jobs.id = candidates.id
  returning jobs.*;
end;
$$;

create or replace function public.complete_media_processing_job(
  target_job_id uuid,
  worker_id text,
  result jsonb
)
returns public.media_processing_jobs
language plpgsql security definer set search_path = public, pg_temp
as $$
declare job_row public.media_processing_jobs;
begin
  select * into job_row from public.media_processing_jobs
  where id = target_job_id and state = 'processing' and locked_by = worker_id
  for update;
  if job_row.id is null then raise exception 'processing lease not held' using errcode = '55000'; end if;

  update public.media set
    r2_key = coalesce(result->>'display_r2_key', ''),
    public_r2_key = nullif(result->>'display_r2_key', ''),
    thumbnail_r2_key = nullif(result->>'thumbnail_r2_key', ''),
    medium_r2_key = nullif(result->>'medium_r2_key', ''),
    large_r2_key = nullif(result->>'large_r2_key', ''),
    url = coalesce(result->>'display_url', ''),
    thumbnail_url = nullif(result->>'thumbnail_url', ''),
    medium_url = nullif(result->>'medium_url', ''),
    large_url = nullif(result->>'large_url', ''),
    avif_thumbnail_r2_key = nullif(result->>'avif_thumbnail_r2_key', ''),
    avif_medium_r2_key = nullif(result->>'avif_medium_r2_key', ''),
    avif_large_r2_key = nullif(result->>'avif_large_r2_key', ''),
    width = (result->>'width')::integer,
    height = (result->>'height')::integer,
    aspect_ratio = (result->>'aspect_ratio')::numeric,
    orientation = result->>'orientation',
    file_size = (result->>'display_size')::bigint,
    mime_type = 'image/webp',
    taken_at = nullif(result->>'taken_at', '')::timestamptz,
    sort_date = coalesce(nullif(result->>'taken_at', '')::timestamptz, uploaded_at, now()),
    metadata_status = result->>'metadata_status',
    metadata_stripped = true,
    content_hash = result->>'content_hash',
    duplicate_of_media_id = nullif(result->>'duplicate_of_media_id', '')::uuid,
    blurhash = result->>'blurhash',
    processing_version = coalesce((result->>'processing_version')::integer, processing_version),
    processing_status = 'ready',
    security_status = 'processed',
    security_notes = 'Decoded and validated by the trusted asynchronous image worker.',
    processed_at = now(),
    updated_at = now()
  where id = job_row.media_id;

  update public.albums
  set cover_media_id = job_row.media_id,
      cover_url = nullif(result->>'thumbnail_url', ''),
      updated_at = now()
  where id = job_row.album_id
    and coalesce((result->>'auto_set_cover')::boolean, false)
    and cover_media_id is null and cover_url is null;
  if found then
    update public.media set is_cover = true where id = job_row.media_id;
  end if;

  update public.media_processing_jobs set
    state = 'ready', checkpoint = result, completed_at = now(),
    locked_at = null, locked_by = null, last_error_code = null, updated_at = now()
  where id = target_job_id returning * into job_row;
  return job_row;
end;
$$;

create or replace function public.fail_media_processing_job(
  target_job_id uuid,
  worker_id text,
  error_code text,
  quarantine boolean default false
)
returns public.media_processing_jobs
language plpgsql security definer set search_path = public, pg_temp
as $$
declare job_row public.media_processing_jobs; next_state text;
begin
  select * into job_row from public.media_processing_jobs
  where id = target_job_id and state = 'processing' and locked_by = worker_id
  for update;
  if job_row.id is null then raise exception 'processing lease not held' using errcode = '55000'; end if;
  next_state = case
    when quarantine then 'quarantined'
    when job_row.attempt_count < job_row.max_attempts then 'queued'
    else 'failed'
  end;
  update public.media_processing_jobs set
    state = next_state,
    available_at = case when next_state = 'queued' then now() + make_interval(secs => least(900, 15 * (2 ^ greatest(attempt_count - 1, 0)))) else available_at end,
    locked_at = null, locked_by = null, last_error_code = left(error_code, 80), updated_at = now()
  where id = target_job_id returning * into job_row;
  update public.media set
    processing_status = next_state,
    security_status = case when next_state = 'quarantined' then 'rejected' else security_status end,
    security_notes = case when next_state = 'quarantined' then 'Media was quarantined by trusted validation.' else security_notes end,
    updated_at = now()
  where id = job_row.media_id;
  return job_row;
end;
$$;

create or replace function public.requeue_media_processing_job(target_media_id uuid)
returns public.media_processing_jobs
language plpgsql security definer set search_path = public, pg_temp
as $$
declare job_row public.media_processing_jobs;
begin
  update public.media_processing_jobs set
    state = 'queued', attempt_count = 0, available_at = now(), locked_at = null,
    locked_by = null, last_error_code = null, completed_at = null, updated_at = now()
  where media_id = target_media_id and state <> 'processing'
  returning * into job_row;
  if job_row.id is null then raise exception 'job unavailable for reprocess' using errcode = '55000'; end if;
  update public.media set processing_status = 'queued', security_status = 'needs_review',
    processed_at = null, updated_at = now() where id = target_media_id;
  return job_row;
end;
$$;

create or replace function public.mark_media_processing_orphan(target_media_id uuid)
returns public.media_processing_jobs
language plpgsql security definer set search_path = public, pg_temp
as $$
declare job_row public.media_processing_jobs;
begin
  update public.media_processing_jobs set state = 'deleting', updated_at = now()
  where media_id = target_media_id and state in ('uploaded', 'failed', 'quarantined')
  returning * into job_row;
  if job_row.id is null then raise exception 'job unavailable for cleanup' using errcode = '55000'; end if;
  update public.media set processing_status = 'deleting', updated_at = now() where id = target_media_id;
  return job_row;
end;
$$;

revoke all on function public.register_media_processing_upload(uuid,uuid,text,text,text,bigint,text) from public, anon, authenticated;
revoke all on function public.get_album_storage_bytes(uuid) from public, anon, authenticated;
revoke all on function public.queue_media_processing_upload(uuid) from public, anon, authenticated;
revoke all on function public.claim_media_processing_jobs(text,integer) from public, anon, authenticated;
revoke all on function public.complete_media_processing_job(uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.fail_media_processing_job(uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.requeue_media_processing_job(uuid) from public, anon, authenticated;
revoke all on function public.mark_media_processing_orphan(uuid) from public, anon, authenticated;
grant execute on function public.register_media_processing_upload(uuid,uuid,text,text,text,bigint,text) to service_role;
grant execute on function public.get_album_storage_bytes(uuid) to service_role;
grant execute on function public.queue_media_processing_upload(uuid) to service_role;
grant execute on function public.claim_media_processing_jobs(text,integer) to service_role;
grant execute on function public.complete_media_processing_job(uuid,text,jsonb) to service_role;
grant execute on function public.fail_media_processing_job(uuid,text,text,boolean) to service_role;
grant execute on function public.requeue_media_processing_job(uuid) to service_role;
grant execute on function public.mark_media_processing_orphan(uuid) to service_role;

-- Publication is state-gated even if a caller accidentally selects unfinished rows.
drop policy if exists "Public read public and updating media" on public.media;
create policy "Public read public and updating media"
on public.media for select to anon, authenticated
using (
  processing_status = 'ready' and deleted_at is null and exists (
    select 1 from public.albums
    where albums.id = media.album_id and albums.status in ('public', 'updating')
  )
);

drop policy if exists "Authorized users read granted private media" on public.media;
create policy "Authorized users read granted private media"
on public.media for select to authenticated
using (
  processing_status = 'ready' and deleted_at is null
  and public.can_access_private_album(album_id)
);

create or replace function public.refresh_album_media_counts()
returns trigger language plpgsql as $$
declare target_album_id uuid;
begin
  target_album_id = coalesce(new.album_id, old.album_id);
  update public.albums set
    photo_count = (select count(*)::integer from public.media where album_id = target_album_id and media_type = 'image' and processing_status = 'ready' and deleted_at is null),
    video_count = (select count(*)::integer from public.media where album_id = target_album_id and media_type = 'video' and processing_status = 'ready' and deleted_at is null),
    media_count = (select count(*)::integer from public.media where album_id = target_album_id and processing_status = 'ready' and deleted_at is null)
  where id = target_album_id;
  return coalesce(new, old);
end;
$$;

comment on table public.media_processing_jobs is
  'Service-role-only durable queue. Source object keys must never be returned in public media payloads.';
