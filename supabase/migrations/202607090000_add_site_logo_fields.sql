ALTER TABLE "public"."site_settings"
ADD COLUMN IF NOT EXISTS "site_logo_alt" text DEFAULT 'Website logo',
ADD COLUMN IF NOT EXISTS "site_favicon_url" text;
