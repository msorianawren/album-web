ALTER TABLE "public"."about_profile" 
  ADD COLUMN IF NOT EXISTS "skills" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "primary_cta_label" text,
  ADD COLUMN IF NOT EXISTS "primary_cta_href" text,
  ADD COLUMN IF NOT EXISTS "secondary_cta_label" text,
  ADD COLUMN IF NOT EXISTS "secondary_cta_href" text;
