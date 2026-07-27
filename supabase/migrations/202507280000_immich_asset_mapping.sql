-- Additive migration: Immich ↔ Oriana media ID mapping.
-- Applied in order. Never modify an applied migration.
-- Safe to run multiple times (idempotent via IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS immich_asset_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oriana_media_id uuid NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  immich_asset_id text NOT NULL,
  source_checksum text,
  sync_state text NOT NULL DEFAULT 'pending'
    CHECK (sync_state IN ('pending', 'synced', 'error', 'removed')),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_immich_oriana_media_id UNIQUE (oriana_media_id),
  CONSTRAINT uq_immich_asset_id UNIQUE (immich_asset_id)
);

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_immich_mapping_oriana
  ON immich_asset_mapping(oriana_media_id);

CREATE INDEX IF NOT EXISTS idx_immich_mapping_immich
  ON immich_asset_mapping(immich_asset_id);

CREATE INDEX IF NOT EXISTS idx_immich_mapping_state
  ON immich_asset_mapping(sync_state)
  WHERE sync_state != 'removed';

-- Enable RLS; mapping table is server-only (no anon access)
ALTER TABLE immich_asset_mapping ENABLE ROW LEVEL SECURITY;

-- Only service role can access (no browser queries)
CREATE POLICY "immich_asset_mapping_service_only"
  ON immich_asset_mapping
  FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE immich_asset_mapping IS
  'Maps Oriana media IDs to Immich asset IDs. Server-only. Immich IDs must not be exposed to browsers.';

COMMENT ON COLUMN immich_asset_mapping.sync_state IS
  'pending: not yet confirmed synced | synced: confirmed mapping | error: sync failed | removed: deactivated (no data deleted)';
