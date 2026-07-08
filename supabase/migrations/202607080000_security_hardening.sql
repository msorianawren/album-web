create table if not exists public.site_settings (
  id text primary key default 'default',
  site_name text not null default 'Oriana Wren',
  site_description text not null default 'A private photo and video album platform.',
  site_logo_url text,
  contact_email text,
  default_album_status text not null default 'private',
  allow_public_comments boolean not null default true,
  allow_public_likes boolean not null default true,
  allow_public_downloads boolean not null default true,
  require_comment_name boolean not null default false,
  maintenance_mode boolean not null default false,
  maintenance_message text,
  default_theme text not null default 'dark',
  homepage_layout text not null default 'featured',
  album_card_density text not null default 'comfortable',
  show_counts_on_cards boolean not null default true,
  show_updated_date boolean not null default true,
  show_status_badges boolean not null default true,
  default_sort_order text not null default 'newest',
  albums_per_page integer not null default 24,
  media_per_page integer not null default 60,
  enable_video_uploads boolean not null default true,
  enable_image_uploads boolean not null default true,
  max_image_size_mb integer not null default 30,
  max_video_size_mb integer not null default 500,
  auto_set_first_image_as_cover boolean not null default true,
  show_video_posters boolean not null default true,
  use_thumbnails_in_grid boolean not null default true,
  max_comment_length integer not null default 1000,
  enable_likes boolean not null default true,
  seo_title text,
  seo_description text,
  og_image_url text,
  twitter_card text not null default 'summary_large_image',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 'default')
);

insert into public.site_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "No direct client settings access" on public.site_settings;
create policy "No direct client settings access"
  on public.site_settings for all
  using (false)
  with check (false);

alter table public.site_settings
  add column if not exists max_upload_files_per_batch integer not null default 20,
  add column if not exists max_album_storage_mb integer not null default 5000,
  add column if not exists max_image_pixels integer not null default 36000000,
  add column if not exists max_video_duration_seconds integer not null default 600,
  add column if not exists max_video_resolution_pixels integer not null default 8294400,
  add column if not exists comment_rate_limit_count integer not null default 6,
  add column if not exists comment_rate_limit_window_seconds integer not null default 300,
  add column if not exists like_rate_limit_count integer not null default 40,
  add column if not exists like_rate_limit_window_seconds integer not null default 300,
  add column if not exists upload_rate_limit_count integer not null default 30,
  add column if not exists upload_rate_limit_window_seconds integer not null default 900,
  add column if not exists download_rate_limit_count integer not null default 60,
  add column if not exists download_rate_limit_window_seconds integer not null default 300,
  add column if not exists admin_mutation_rate_limit_count integer not null default 120,
  add column if not exists admin_mutation_rate_limit_window_seconds integer not null default 300,
  add column if not exists block_duplicate_comments boolean not null default true,
  add column if not exists block_comment_links boolean not null default true,
  add column if not exists moderate_suspicious_comments boolean not null default true,
  add column if not exists strip_image_metadata boolean not null default true,
  add column if not exists store_private_originals boolean not null default false,
  add column if not exists allow_original_downloads boolean not null default false,
  add column if not exists enable_media_watermark boolean not null default false,
  add column if not exists watermark_text text,
  add column if not exists disable_public_right_click boolean not null default false,
  add column if not exists enable_soft_delete boolean not null default true,
  add column if not exists soft_delete_retention_days integer not null default 30;

alter table public.site_settings
  drop constraint if exists site_settings_max_upload_files_check,
  add constraint site_settings_max_upload_files_check check (max_upload_files_per_batch between 1 and 100);

alter table public.site_settings
  drop constraint if exists site_settings_max_album_storage_check,
  add constraint site_settings_max_album_storage_check check (max_album_storage_mb between 100 and 100000);

alter table public.site_settings
  drop constraint if exists site_settings_max_image_pixels_check,
  add constraint site_settings_max_image_pixels_check check (max_image_pixels between 1000000 and 100000000);

alter table public.site_settings
  drop constraint if exists site_settings_comment_rate_limit_check,
  add constraint site_settings_comment_rate_limit_check check (
    comment_rate_limit_count between 1 and 200
    and comment_rate_limit_window_seconds between 10 and 86400
  );

alter table public.site_settings
  drop constraint if exists site_settings_like_rate_limit_check,
  add constraint site_settings_like_rate_limit_check check (
    like_rate_limit_count between 1 and 1000
    and like_rate_limit_window_seconds between 10 and 86400
  );

alter table public.site_settings
  drop constraint if exists site_settings_upload_rate_limit_check,
  add constraint site_settings_upload_rate_limit_check check (
    upload_rate_limit_count between 1 and 500
    and upload_rate_limit_window_seconds between 10 and 86400
  );

alter table public.site_settings
  drop constraint if exists site_settings_download_rate_limit_check,
  add constraint site_settings_download_rate_limit_check check (
    download_rate_limit_count between 1 and 2000
    and download_rate_limit_window_seconds between 10 and 86400
  );

alter table public.site_settings
  drop constraint if exists site_settings_soft_delete_retention_check,
  add constraint site_settings_soft_delete_retention_check check (soft_delete_retention_days between 1 and 365);

alter table public.albums
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id),
  add column if not exists delete_reason text;

alter table public.media
  add column if not exists public_r2_key text,
  add column if not exists original_private_r2_key text,
  add column if not exists security_status text not null default 'processed',
  add column if not exists security_notes text,
  add column if not exists download_allowed boolean not null default true,
  add column if not exists original_download_allowed boolean not null default false,
  add column if not exists metadata_stripped boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id),
  add column if not exists delete_reason text;

alter table public.media
  drop constraint if exists media_security_status_check,
  add constraint media_security_status_check check (security_status in ('processed', 'needs_review', 'rejected'));

alter table public.comments
  add column if not exists author_user_id uuid references auth.users(id) on delete set null,
  add column if not exists author_email text,
  add column if not exists client_id text,
  add column if not exists ip_hash text,
  add column if not exists moderation_status text not null default 'visible',
  add column if not exists moderation_reason text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id),
  add column if not exists delete_reason text;

alter table public.comments
  drop constraint if exists comments_moderation_status_check,
  add constraint comments_moderation_status_check check (moderation_status in ('visible', 'pending', 'hidden', 'deleted'));

create table if not exists public.security_rate_limits (
  key text not null,
  action text not null,
  count integer not null default 1,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (key, action)
);

alter table public.security_rate_limits enable row level security;

drop policy if exists "No direct client rate limit access" on public.security_rate_limits;
create policy "No direct client rate limit access"
  on public.security_rate_limits for all
  using (false)
  with check (false);

create index if not exists albums_deleted_at_idx on public.albums(deleted_at);
create index if not exists media_deleted_at_idx on public.media(deleted_at);
create index if not exists media_download_allowed_idx on public.media(download_allowed);
create index if not exists comments_author_user_created_idx on public.comments(author_user_id, created_at desc);
create index if not exists comments_ip_hash_created_idx on public.comments(ip_hash, created_at desc);
create index if not exists comments_moderation_status_idx on public.comments(moderation_status);
create index if not exists comments_deleted_at_idx on public.comments(deleted_at);
create index if not exists security_rate_limits_reset_idx on public.security_rate_limits(reset_at);
