-- Create album_invites table
CREATE TABLE IF NOT EXISTS public.album_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    album_id uuid REFERENCES public.albums(id) ON DELETE CASCADE,
    is_global boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    CONSTRAINT check_target CHECK (album_id IS NOT NULL OR is_global = true)
);

-- Convert email to lowercase for consistent lookups
CREATE OR REPLACE FUNCTION public.lowercase_invite_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email = LOWER(NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lowercase_invite_email_trigger
BEFORE INSERT OR UPDATE ON public.album_invites
FOR EACH ROW EXECUTE FUNCTION public.lowercase_invite_email();

-- Prevent duplicate album-specific invites
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_album_invite 
ON public.album_invites (email, album_id) 
WHERE album_id IS NOT NULL;

-- Prevent duplicate global invites
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_global_invite 
ON public.album_invites (email) 
WHERE is_global = true;

-- Setup RLS
ALTER TABLE public.album_invites ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage album_invites" 
ON public.album_invites 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.role IN ('founder', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.role IN ('founder', 'admin')
    )
);

-- Users can read their own invites (Note: auth.jwt()->>'email' might be empty in some auth configurations, but this is a fallback)
CREATE POLICY "Users can read their own invites"
ON public.album_invites
FOR SELECT
TO authenticated
USING (
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
);
