-- Facebook Page video feed cache. Rollback: supabase/rollbacks/202607290900_meta_page_video_feed_rollback.sql

create table if not exists public.meta_page_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'facebook' check (provider = 'facebook'),
  page_id text not null,
  page_name text not null,
  page_picture_url text,
  encrypted_page_access_token text not null,
  token_key_version text not null,
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  connected_by uuid references auth.users(id) on delete set null,
  connection_status text not null default 'connected' check (connection_status in ('connected', 'disconnected', 'expired', 'needs_attention')),
  is_active boolean not null default true,
  last_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists meta_page_connections_one_active_facebook
  on public.meta_page_connections (provider) where is_active = true;
create unique index if not exists meta_page_connections_provider_page_unique
  on public.meta_page_connections (provider, page_id);

create table if not exists public.meta_feed_items (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.meta_page_connections(id) on delete cascade,
  provider_item_id text not null,
  post_id text,
  video_id text,
  item_type text not null check (item_type in ('video', 'reel', 'live_replay', 'video_post')),
  message text,
  title text,
  permalink_url text not null,
  embed_url text,
  thumbnail_url text,
  width integer,
  height integer,
  duration_seconds integer,
  published_at timestamptz,
  is_public boolean not null default true,
  is_available boolean not null default true,
  consecutive_missing_syncs integer not null default 0 check (consecutive_missing_syncs >= 0),
  raw_metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, provider_item_id),
  check (permalink_url like 'https://%'),
  check (embed_url is null or embed_url like 'https://www.facebook.com/%')
);

create index if not exists meta_feed_items_connection_published_idx on public.meta_feed_items (connection_id, published_at desc);
create index if not exists meta_feed_items_available_idx on public.meta_feed_items (is_public, is_available, published_at desc);

create table if not exists public.meta_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  encrypted_user_access_token text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists meta_oauth_states_expiry_idx on public.meta_oauth_states (expires_at);

alter table public.landing_page_settings add column if not exists meta_feed_settings jsonb not null default '{
  "enabled": false,
  "eyebrow": "Recent Motion",
  "heading": "Stories in motion",
  "description": "A selection of recent moving images and behind-the-scenes moments.",
  "selectedItemIds": [],
  "featuredItemId": null,
  "layout": "editorial",
  "playMode": "inline",
  "showCaption": true,
  "showPublishedDate": true,
  "showFacebookBranding": true,
  "autoFillLatest": false,
  "maxItems": 4,
  "itemOverrides": {}
}'::jsonb;

drop trigger if exists meta_page_connections_set_updated_at on public.meta_page_connections;
create trigger meta_page_connections_set_updated_at before update on public.meta_page_connections for each row execute function public.set_updated_at();
drop trigger if exists meta_feed_items_set_updated_at on public.meta_feed_items;
create trigger meta_feed_items_set_updated_at before update on public.meta_feed_items for each row execute function public.set_updated_at();

alter table public.meta_page_connections enable row level security;
alter table public.meta_feed_items enable row level security;
alter table public.meta_oauth_states enable row level security;
drop policy if exists "No direct client meta connection access" on public.meta_page_connections;
create policy "No direct client meta connection access" on public.meta_page_connections for all to anon, authenticated using (false) with check (false);
drop policy if exists "No direct client meta feed access" on public.meta_feed_items;
create policy "No direct client meta feed access" on public.meta_feed_items for all to anon, authenticated using (false) with check (false);
drop policy if exists "No direct client meta oauth access" on public.meta_oauth_states;
create policy "No direct client meta oauth access" on public.meta_oauth_states for all to anon, authenticated using (false) with check (false);
