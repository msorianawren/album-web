-- Migration: Add layout and customization columns

ALTER TABLE "public"."site_settings"
  ADD COLUMN IF NOT EXISTS "about_layout" text DEFAULT 'editorial',
  ADD COLUMN IF NOT EXISTS "about_hero_treatment" text DEFAULT 'cover_split',
  ADD COLUMN IF NOT EXISTS "homepage_hero_preset" text DEFAULT 'cinematic',
  ADD COLUMN IF NOT EXISTS "social_tree_style" text DEFAULT 'botanical',
  ADD COLUMN IF NOT EXISTS "collaborator_mode" text DEFAULT 'portraits',
  ADD COLUMN IF NOT EXISTS "homepage_gallery_mode" text DEFAULT 'editorial_grid',
  ADD COLUMN IF NOT EXISTS "album_list_layout" text DEFAULT 'editorial',
  ADD COLUMN IF NOT EXISTS "album_viewer_style" text DEFAULT 'clean';

ALTER TABLE "public"."about_profile"
  ADD COLUMN IF NOT EXISTS "section_toggles" jsonb DEFAULT '{}'::jsonb;

ALTER TABLE "public"."landing_page_settings"
  ADD COLUMN IF NOT EXISTS "section_toggles" jsonb DEFAULT '{}'::jsonb;
