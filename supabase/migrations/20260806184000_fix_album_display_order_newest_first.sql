-- Migration: 20260806184000_fix_album_display_order_newest_first.sql
-- Description: Ensure newly created or status-changed albums always land at position #1 (Top) by default.

-- ============================================================================
-- 1. UPDATE change_album_status RPC to place status-changed album at POSITION #1
-- ============================================================================

CREATE OR REPLACE FUNCTION public.change_album_status(
  p_album_id uuid,
  p_new_status text,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_min_order integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = p_user_id AND role IN ('admin', 'founder')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  IF p_new_status NOT IN ('public', 'private', 'updating') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  -- Assign min(sort_order) - 10 so the album lands at position #1 (TOP) in target status
  IF p_new_status = 'public' THEN
    SELECT COALESCE(min(public_sort_order), 10) - 10 INTO v_min_order FROM public.albums WHERE status = 'public' AND deleted_at IS NULL AND public_sort_order IS NOT NULL;
    UPDATE public.albums
    SET status = p_new_status,
        public_sort_order = v_min_order,
        private_sort_order = NULL,
        updating_sort_order = NULL,
        updated_at = now()
    WHERE id = p_album_id;
  ELSIF p_new_status = 'private' THEN
    SELECT COALESCE(min(private_sort_order), 10) - 10 INTO v_min_order FROM public.albums WHERE status = 'private' AND deleted_at IS NULL AND private_sort_order IS NOT NULL;
    UPDATE public.albums
    SET status = p_new_status,
        private_sort_order = v_min_order,
        public_sort_order = NULL,
        updating_sort_order = NULL,
        updated_at = now()
    WHERE id = p_album_id;
  ELSIF p_new_status = 'updating' THEN
    SELECT COALESCE(min(updating_sort_order), 10) - 10 INTO v_min_order FROM public.albums WHERE status = 'updating' AND deleted_at IS NULL AND updating_sort_order IS NOT NULL;
    UPDATE public.albums
    SET status = p_new_status,
        updating_sort_order = v_min_order,
        public_sort_order = NULL,
        private_sort_order = NULL,
        updated_at = now()
    WHERE id = p_album_id;
  END IF;
END;
$$;


-- ============================================================================
-- 2. UPDATE list_album_page to fallback NULL sort order to 0 instead of INT_MAX
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_album_page(
  p_status text,
  p_query text DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  description text,
  status text,
  cover_url text,
  cover_media_id uuid,
  safe_preview_url text,
  feather_purchase_enabled boolean,
  feather_price integer,
  effective_feather_price integer,
  photo_count integer,
  video_count integer,
  media_count integer,
  like_count integer,
  comment_count integer,
  default_media_sort text,
  public_sort_order integer,
  private_sort_order integer,
  updating_sort_order integer,
  created_at timestamptz,
  updated_at timestamptz,
  access_request_status text,
  preview_items jsonb,
  pagination_sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH scoped AS (
    SELECT
      a.*,
      CASE a.status
        WHEN 'public' THEN COALESCE(a.public_sort_order, 0)
        WHEN 'updating' THEN COALESCE(a.updating_sort_order, 0)
        WHEN 'private' THEN COALESCE(a.private_sort_order, 0)
      END AS list_sort_order,
      CASE
        WHEN a.status = 'private' THEN public.private_album_access_decision(a.id)
        ELSE 'ALLOWED_PUBLIC'
      END AS access_decision
    FROM public.albums a
    WHERE a.deleted_at IS NULL
      AND a.status = p_status
      AND (
        nullif(btrim(p_query), '') IS NULL
        OR a.title ILIKE '%' || btrim(p_query) || '%'
        OR COALESCE(a.description, '') ILIKE '%' || btrim(p_query) || '%'
      )
  ),
  paged AS (
    SELECT *
    FROM scoped
    ORDER BY list_sort_order ASC, created_at DESC, id ASC
    LIMIT least(greatest(coalesce(p_limit, 24), 1), 100)
    OFFSET p_offset
  )
  SELECT
    a.id,
    a.title,
    a.slug,
    a.description,
    a.status,
    CASE WHEN a.status = 'private' THEN a.safe_preview_url ELSE a.cover_url END AS cover_url,
    a.cover_media_id,
    a.safe_preview_url,
    a.feather_purchase_enabled,
    a.feather_price,
    CASE
      WHEN a.status = 'private' AND a.feather_purchase_enabled
        THEN COALESCE(a.feather_price, settings.private_album_default_feather_price)
      ELSE NULL
    END AS effective_feather_price,
    a.photo_count,
    a.video_count,
    a.media_count,
    a.like_count,
    a.comment_count,
    a.default_media_sort,
    a.public_sort_order,
    a.private_sort_order,
    a.updating_sort_order,
    a.created_at,
    a.updated_at,
    CASE
      WHEN a.access_decision LIKE 'ALLOWED_%' THEN 'approved'
      WHEN a.access_decision = 'DENIED_REVOKED' THEN 'revoked'
      WHEN a.access_decision = 'DENIED_PENDING' THEN 'pending'
      WHEN a.access_decision = 'DENIED_REJECTED' THEN 'rejected'
      ELSE NULL
    END AS access_request_status,
    COALESCE(previews.items, '[]'::jsonb) AS preview_items,
    a.list_sort_order AS pagination_sort_order
  FROM paged a
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT private_album_default_feather_price FROM public.site_settings WHERE id = 'default'),
      150
    ) AS private_album_default_feather_price
  ) settings
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      CASE
        WHEN a.status = 'private' THEN jsonb_build_object(
          'id', m.id,
          'media_type', m.media_type,
          'title', m.title
        )
        ELSE jsonb_build_object(
          'id', m.id,
          'media_type', m.media_type,
          'title', m.title,
          'url', m.url,
          'thumbnail_url', m.thumbnail_url,
          'medium_url', m.medium_url,
          'poster_url', m.poster_url
        )
      END
      ORDER BY m.sort_order ASC, m.created_at ASC, m.id ASC
    ) AS items
    FROM (
      SELECT
        media.id,
        media.media_type,
        media.title,
        media.url,
        media.thumbnail_url,
        media.medium_url,
        media.poster_url,
        media.sort_order,
        media.created_at
      FROM public.media
      WHERE media.album_id = a.id
        AND media.deleted_at IS NULL
        AND media.processing_status = 'ready'
        AND (a.status <> 'private' OR a.access_decision LIKE 'ALLOWED_%')
      ORDER BY media.sort_order ASC, media.created_at ASC, media.id ASC
      LIMIT 4
    ) m
  ) previews ON true
  ORDER BY a.list_sort_order ASC, a.created_at DESC, a.id ASC;
$$;
