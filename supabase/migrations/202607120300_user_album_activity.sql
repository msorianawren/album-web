-- Create user_album_activity table
create table if not exists public.user_album_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  album_id uuid not null references public.albums(id) on delete cascade,
  media_id uuid references public.media(id) on delete set null,
  event_type text not null,
  created_at timestamptz not null default now(),
  album_status_at_event text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  constraint event_type_check check (event_type in ('album_viewed', 'album_downloaded_zip', 'album_downloaded_media', 'album_access_requested', 'album_access_approved', 'album_access_rejected'))
);

create index if not exists user_album_activity_user_created_idx on public.user_album_activity(user_id, created_at desc);
create index if not exists user_album_activity_user_album_idx on public.user_album_activity(user_id, album_id);
create index if not exists user_album_activity_event_created_idx on public.user_album_activity(event_type, created_at desc);
create index if not exists user_album_activity_album_created_idx on public.user_album_activity(album_id, created_at desc);

alter table public.user_album_activity enable row level security;

-- Admin manages user activity.
drop policy if exists "Admin manages user activity" on public.user_album_activity;
create policy "Admin manages user activity"
  on public.user_album_activity for all
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles
      where user_profiles.user_id = (select auth.uid())
        and user_profiles.role in ('admin', 'founder')
    )
  );

-- No public read or insert access. Insert should be done securely server-side bypassing RLS using service role.
