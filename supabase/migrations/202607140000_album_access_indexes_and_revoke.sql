-- 1. Add revoke_reason column if it doesn't exist
ALTER TABLE public.album_access_grants ADD COLUMN IF NOT EXISTS revoke_reason text;

-- 2. Create high-performance indexes for server-side pagination and fast filtering

-- Indexes for album_access_grants
CREATE INDEX IF NOT EXISTS idx_album_access_grants_user_status 
ON public.album_access_grants (user_id, status);

CREATE INDEX IF NOT EXISTS idx_album_access_grants_email_status 
ON public.album_access_grants (email_normalized, status);

CREATE INDEX IF NOT EXISTS idx_album_access_grants_album_status 
ON public.album_access_grants (album_id, status);

CREATE INDEX IF NOT EXISTS idx_album_access_grants_scope_status 
ON public.album_access_grants (scope, status);

CREATE INDEX IF NOT EXISTS idx_album_access_grants_granted_at_desc 
ON public.album_access_grants (granted_at DESC);

CREATE INDEX IF NOT EXISTS idx_album_access_grants_revoked_at_desc 
ON public.album_access_grants (revoked_at DESC);

-- Indexes for album_access_requests
CREATE INDEX IF NOT EXISTS idx_album_access_requests_status_created 
ON public.album_access_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_album_access_requests_requester_status 
ON public.album_access_requests (requester_user_id, status);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
