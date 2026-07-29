-- Review-only additive migration. Do not apply through Supabase CLI without approval.
alter table public.social_embed_items
  add column if not exists playback_mode text not null default 'facebook_embed',
  add column if not exists video_url text,
  add column if not exists video_mime_type text,
  add column if not exists video_size_bytes bigint,
  add column if not exists duration_seconds numeric;

alter table public.social_embed_items
  drop constraint if exists social_embed_items_playback_mode_check,
  drop constraint if exists social_embed_items_native_video_check,
  drop constraint if exists social_embed_items_video_metadata_check,
  drop constraint if exists social_embed_items_duration_check;

alter table public.social_embed_items
  add constraint social_embed_items_playback_mode_check
    check (playback_mode in ('native', 'facebook_embed')),
  add constraint social_embed_items_native_video_check
    check (
      playback_mode = 'facebook_embed'
      or (
        video_url is not null
        and video_url like 'https://%'
        and video_mime_type = 'video/mp4'
        and video_size_bytes is not null
      )
    ),
  add constraint social_embed_items_video_metadata_check
    check (
      video_size_bytes is null or video_size_bytes > 0
    ),
  add constraint social_embed_items_duration_check
    check (
      duration_seconds is null or duration_seconds > 0
    );

comment on column public.social_embed_items.video_url is
  'Server-managed public media URL. The application enforces the configured R2 public origin and landing/facebook-feed/videos prefix.';
