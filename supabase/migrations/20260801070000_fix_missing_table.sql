-- Create album_access_requests table
CREATE TABLE IF NOT EXISTS public.album_access_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    requester_user_id uuid,
    requester_email text,
    requester_name text NOT NULL,
    requester_phone text NOT NULL,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note text,
    reviewed_by uuid REFERENCES auth.users(id),
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Unique index to prevent multiple pending requests for the same user and album
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_album_access_request 
ON public.album_access_requests (album_id, requester_user_id) 
WHERE status = 'pending' AND requester_user_id IS NOT NULL;

-- Setup RLS
ALTER TABLE public.album_access_requests ENABLE ROW LEVEL SECURITY;

-- Safely recreate policies by dropping them if they exist first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage album_access_requests" ON public.album_access_requests;
    DROP POLICY IF EXISTS "Users can manage their own requests" ON public.album_access_requests;
END $$;

-- Admins can do everything
CREATE POLICY "Admins can manage album_access_requests" 
ON public.album_access_requests 
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

-- Authenticated users can insert their own requests and view their own requests
CREATE POLICY "Users can manage their own requests" 
ON public.album_access_requests 
FOR ALL 
TO authenticated 
USING (requester_user_id = auth.uid())
WITH CHECK (requester_user_id = auth.uid());

-- Force Supabase to reload its schema cache so the API recognizes the new table
NOTIFY pgrst, 'reload schema';
