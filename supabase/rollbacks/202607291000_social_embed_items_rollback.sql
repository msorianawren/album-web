-- Reverses the curated Facebook professional-profile feed migration.
-- This permanently deletes the curated item library and removes its landing settings.

drop function if exists public.delete_social_embed_item_and_cleanup(uuid);
drop table if exists public.social_embed_items;

alter table if exists public.landing_page_settings
  drop column if exists facebook_feed_settings;

notify pgrst, 'reload schema';
