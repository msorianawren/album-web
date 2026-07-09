CREATE TABLE IF NOT EXISTS "public"."about_profile" (
    "id" text NOT NULL DEFAULT 'main',
    "display_name" text,
    "professional_title" text,
    "tagline" text,
    "short_bio" text,
    "full_bio" text,
    "birthplace" text,
    "location" text,
    "nationality" text,
    "education" jsonb DEFAULT '[]'::jsonb,
    "career" jsonb DEFAULT '[]'::jsonb,
    "hobbies" jsonb DEFAULT '[]'::jsonb,
    "languages" jsonb DEFAULT '[]'::jsonb,
    "achievements" jsonb DEFAULT '[]'::jsonb,
    "personal_metrics" jsonb DEFAULT '{}'::jsonb,
    "personality_traits" jsonb DEFAULT '[]'::jsonb,
    "relationship_status" text,
    "quote" text,
    "profile_image_url" text,
    "cover_image_url" text,
    "gallery_media_ids" jsonb DEFAULT '[]'::jsonb,
    "primary_cta_label" text,
    "primary_cta_href" text,
    "secondary_cta_label" text,
    "secondary_cta_href" text,
    "social_links" jsonb DEFAULT '[]'::jsonb,
    "is_public" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT now(),
    PRIMARY KEY ("id")
);

ALTER TABLE "public"."about_profile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to about_profile." 
ON "public"."about_profile" 
FOR SELECT 
USING (true);

CREATE POLICY "Allow founders to manage about_profile." 
ON "public"."about_profile" 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('founder', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('founder', 'admin')
    )
);

INSERT INTO "public"."about_profile" ("id") VALUES ('main') ON CONFLICT DO NOTHING;
