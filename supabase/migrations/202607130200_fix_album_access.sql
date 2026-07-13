-- Create album_access_grants table
CREATE TABLE IF NOT EXISTS public.album_access_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email_normalized text,
    scope text NOT NULL CHECK (scope IN ('all_private', 'selected_albums')),
    album_id uuid REFERENCES public.albums(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    granted_by uuid NOT NULL REFERENCES auth.users(id),
    granted_at timestamptz NOT NULL DEFAULT now(),
    revoked_by uuid REFERENCES auth.users(id),
    revoked_at timestamptz,
    note text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Unique index to prevent duplicate active grants
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_album_access_grant 
ON public.album_access_grants (user_id, album_id) 
WHERE status = 'active' AND user_id IS NOT NULL AND album_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_global_access_grant 
ON public.album_access_grants (user_id) 
WHERE status = 'active' AND scope = 'all_private' AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_email_album_grant 
ON public.album_access_grants (email_normalized, album_id) 
WHERE status = 'active' AND email_normalized IS NOT NULL AND album_id IS NOT NULL AND user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_email_global_grant 
ON public.album_access_grants (email_normalized) 
WHERE status = 'active' AND scope = 'all_private' AND email_normalized IS NOT NULL AND user_id IS NULL;

-- Setup RLS
ALTER TABLE public.album_access_grants ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage album_access_grants" ON public.album_access_grants;
    DROP POLICY IF EXISTS "Users can view own grants" ON public.album_access_grants;
END $$;

CREATE POLICY "Admins can manage album_access_grants" 
ON public.album_access_grants 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role IN ('founder', 'admin')
        AND coalesce(p.is_blocked, false) = false
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role IN ('founder', 'admin')
        AND coalesce(p.is_blocked, false) = false
    )
);

CREATE POLICY "Users can view own grants" 
ON public.album_access_grants 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR email_normalized = auth.jwt() ->> 'email');

-- Safely fix the RLS policies for album_access_requests that previously caused the crash
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage album_access_requests" ON public.album_access_requests;
    DROP POLICY IF EXISTS "Users can manage their own requests" ON public.album_access_requests;
END $$;

CREATE POLICY "Admins can manage album_access_requests" 
ON public.album_access_requests 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role IN ('founder', 'admin')
        AND coalesce(p.is_blocked, false) = false
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.user_id = auth.uid() 
        AND p.role IN ('founder', 'admin')
        AND coalesce(p.is_blocked, false) = false
    )
);

CREATE POLICY "Users can manage their own requests" 
ON public.album_access_requests 
FOR ALL 
TO authenticated 
USING (requester_user_id = auth.uid())
WITH CHECK (requester_user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
