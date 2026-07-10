ALTER TABLE "public"."about_profile" ADD COLUMN IF NOT EXISTS "skills" jsonb DEFAULT '[]'::jsonb;
