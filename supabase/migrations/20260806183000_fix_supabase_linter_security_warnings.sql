-- Migration: 20260806183000_fix_supabase_linter_security_warnings.sql
-- Description: Complete fix for database warnings, soft-delete slug unique constraint, and exact column names.

-- ============================================================================
-- 0. FIX SOFT-DELETED ALBUM SLUG DUPLICATE BUG (Partial Unique Index)
-- ============================================================================

-- Drop the full table unique constraint on slug that blocks creating new albums with same name as deleted albums
ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_slug_key;

-- Create partial unique index so ONLY active albums (deleted_at IS NULL) must have unique slugs
CREATE UNIQUE INDEX IF NOT EXISTS albums_slug_active_unique ON public.albums (slug) WHERE deleted_at IS NULL;


-- ============================================================================
-- 1. FIX FUNCTION SEARCH PATH MUTABLE WARNINGS (Lint 0011)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'set_updated_at') THEN
    ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'refresh_album_photo_count') THEN
    ALTER FUNCTION public.refresh_album_photo_count() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'refresh_album_media_counts') THEN
    ALTER FUNCTION public.refresh_album_media_counts() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'refresh_album_comment_counts') THEN
    ALTER FUNCTION public.refresh_album_comment_counts() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'refresh_album_like_counts') THEN
    ALTER FUNCTION public.refresh_album_like_counts() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'refresh_media_comment_counts') THEN
    ALTER FUNCTION public.refresh_media_comment_counts() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'refresh_media_like_counts') THEN
    ALTER FUNCTION public.refresh_media_like_counts() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'lowercase_invite_email') THEN
    ALTER FUNCTION public.lowercase_invite_email() SET search_path = public, pg_temp;
  END IF;

  -- Set search_path for user-facing security definer RPCs
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'append_user_help_message') THEN
    ALTER FUNCTION public.append_user_help_message(uuid, text) SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'create_user_help_thread') THEN
    ALTER FUNCTION public.create_user_help_thread(text, text, text, text) SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'purchase_private_album_with_feathers') THEN
    ALTER FUNCTION public.purchase_private_album_with_feathers(uuid) SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'can_access_private_album') THEN
    ALTER FUNCTION public.can_access_private_album(uuid) SET search_path = public, pg_temp;
  END IF;
END $$;


-- ============================================================================
-- 2. SECURE ADMIN SECURITY DEFINER FUNCTIONS (Lint 0028 & 0029)
-- ============================================================================

DO $$
BEGIN
  -- Overload 1: change_album_status(uuid, text)
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'change_album_status' AND pg_get_function_identity_arguments(p.oid) = 'p_album_id uuid, p_new_status text') THEN
    REVOKE EXECUTE ON FUNCTION public.change_album_status(uuid, text) FROM public, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.change_album_status(uuid, text) TO service_role;
    ALTER FUNCTION public.change_album_status(uuid, text) SET search_path = public, pg_temp;
  END IF;

  -- Overload 2: change_album_status(uuid, text, uuid)
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'change_album_status' AND pg_get_function_identity_arguments(p.oid) = 'p_album_id uuid, p_new_status text, p_user_id uuid') THEN
    REVOKE EXECUTE ON FUNCTION public.change_album_status(uuid, text, uuid) FROM public, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.change_album_status(uuid, text, uuid) TO service_role;
    ALTER FUNCTION public.change_album_status(uuid, text, uuid) SET search_path = public, pg_temp;
  END IF;

  -- Overload 1: reorder_albums(text, uuid[])
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'reorder_albums' AND pg_get_function_identity_arguments(p.oid) = 'p_status text, p_album_ids uuid[]') THEN
    REVOKE EXECUTE ON FUNCTION public.reorder_albums(text, uuid[]) FROM public, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.reorder_albums(text, uuid[]) TO service_role;
    ALTER FUNCTION public.reorder_albums(text, uuid[]) SET search_path = public, pg_temp;
  END IF;

  -- Overload 2: reorder_albums(text, uuid[], uuid)
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'reorder_albums' AND pg_get_function_identity_arguments(p.oid) = 'p_status text, p_album_ids uuid[], p_user_id uuid') THEN
    REVOKE EXECUTE ON FUNCTION public.reorder_albums(text, uuid[], uuid) FROM public, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.reorder_albums(text, uuid[], uuid) TO service_role;
    ALTER FUNCTION public.reorder_albums(text, uuid[], uuid) SET search_path = public, pg_temp;
  END IF;

  -- Inventory sync triggers
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'sync_private_media_asset_inventory_from_album') THEN
    REVOKE EXECUTE ON FUNCTION public.sync_private_media_asset_inventory_from_album() FROM public, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.sync_private_media_asset_inventory_from_album() TO service_role;
    ALTER FUNCTION public.sync_private_media_asset_inventory_from_album() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'sync_private_media_asset_inventory_from_media') THEN
    REVOKE EXECUTE ON FUNCTION public.sync_private_media_asset_inventory_from_media() FROM public, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.sync_private_media_asset_inventory_from_media() TO service_role;
    ALTER FUNCTION public.sync_private_media_asset_inventory_from_media() SET search_path = public, pg_temp;
  END IF;
END $$;

-- Convert read query RPCs from SECURITY DEFINER to SECURITY INVOKER
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'list_album_page') THEN
    ALTER FUNCTION public.list_album_page(text, text, integer, integer) SECURITY INVOKER SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'list_album_summaries') THEN
    ALTER FUNCTION public.list_album_summaries(text, text, integer, integer, timestamp with time zone, text) SECURITY INVOKER SET search_path = public, pg_temp;
  END IF;
END $$;


-- ============================================================================
-- 3. FIX OVERLY PERMISSIVE RLS INSERT POLICIES (Lint 0024)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'Anyone can insert contact messages') THEN
    ALTER POLICY "Anyone can insert contact messages" ON public.contact_messages
      WITH CHECK (char_length(message_body) > 0);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'likes' AND policyname = 'Public create likes') THEN
    ALTER POLICY "Public create likes" ON public.likes
      WITH CHECK (album_id IS NOT NULL OR media_id IS NOT NULL);
  END IF;
END $$;
