-- Migration: Add advanced settings JSONB column to SiteSettings to avoid frequent migrations for minor toggles
ALTER TABLE "public"."site_settings"
  ADD COLUMN IF NOT EXISTS "advanced_settings" jsonb DEFAULT '{}'::jsonb;
