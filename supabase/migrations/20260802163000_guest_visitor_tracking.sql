-- Migration: Guest Visitor Tracking
-- Adds guest_visitors table, guest_album_activity, and linking columns

-- 1. Guest visitors table
CREATE TABLE IF NOT EXISTS guest_visitors (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint    text        UNIQUE NOT NULL,        -- SHA-256(IP+UA), used as fallback
  visitor_name   text        UNIQUE NOT NULL,        -- e.g. "HANOI_1", "DUBAI_2"
  city           text,                               -- Decoded city name
  country_code   text,                               -- ISO 2-letter: "VN", "AE"
  ip_masked      text,                               -- e.g. "203.0.x.x" — NOT full IP
  first_seen_at  timestamptz DEFAULT now() NOT NULL,
  last_seen_at   timestamptz DEFAULT now() NOT NULL,
  user_agent     text,
  linked_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata       jsonb       NOT NULL DEFAULT '{}',  -- device info: browser, os, app
  expires_at     timestamptz NOT NULL DEFAULT now() + interval '2 years'
);

CREATE INDEX IF NOT EXISTS idx_guest_visitors_fingerprint
  ON guest_visitors(fingerprint);

CREATE INDEX IF NOT EXISTS idx_guest_visitors_linked_user
  ON guest_visitors(linked_user_id)
  WHERE linked_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_visitors_expires
  ON guest_visitors(expires_at);

-- RLS: only service role can access (public has no access)
ALTER TABLE guest_visitors ENABLE ROW LEVEL SECURITY;

-- 2. Guest album activity table
CREATE TABLE IF NOT EXISTS guest_album_activity (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_visitor_id      uuid        NOT NULL REFERENCES guest_visitors(id) ON DELETE CASCADE,
  album_id              uuid,
  media_id              uuid,
  event_type            text        NOT NULL,  -- 'album_viewed', 'album_downloaded_zip', etc.
  album_status_at_event text,
  source                text,
  created_at            timestamptz DEFAULT now() NOT NULL,
  expires_at            timestamptz NOT NULL DEFAULT now() + interval '1 year',
  metadata              jsonb       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_guest_activity_visitor
  ON guest_album_activity(guest_visitor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guest_activity_album
  ON guest_album_activity(album_id)
  WHERE album_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_activity_expires
  ON guest_album_activity(expires_at);

-- RLS: only service role can access
ALTER TABLE guest_album_activity ENABLE ROW LEVEL SECURITY;

-- 3. Link guest → user when they register
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS former_guest_visitor_id uuid
  REFERENCES guest_visitors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_former_guest
  ON user_profiles(former_guest_visitor_id)
  WHERE former_guest_visitor_id IS NOT NULL;

-- 4. Link audit log entries → guest visitor
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS guest_visitor_id uuid
  REFERENCES guest_visitors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_guest_visitor
  ON audit_logs(guest_visitor_id)
  WHERE guest_visitor_id IS NOT NULL;
