-- Rollback only after confirming the feature is disabled and no connection token needs to be retained.
alter table public.landing_page_settings drop column if exists meta_feed_settings;
drop table if exists public.meta_oauth_states;
drop table if exists public.meta_feed_items;
drop table if exists public.meta_page_connections;
