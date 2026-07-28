-- Manual rollback for 202607291000_social_embed_items.sql.
-- This permanently deletes curated Facebook feed items; do not run automatically.

alter table public.landing_page_settings drop column if exists facebook_feed_settings;
drop function if exists public.delete_social_embed_item_and_cleanup(uuid);
drop table if exists public.social_embed_items;
