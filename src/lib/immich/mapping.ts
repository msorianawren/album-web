/**
 * Mapping between Oriana media IDs and Immich asset IDs.
 *
 * Server-only. Immich asset IDs must not leak to clients.
 *
 * Callers must supply an explicitly authorized server client. The mapping
 * module never creates or widens database privileges on its own.
 * Migration: supabase/migrations/XXXX_immich_asset_mapping.sql
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ImmichAssetMapping {
  orianaMediaId: string;
  immichAssetId: string;
  syncState: "pending" | "synced" | "error" | "removed";
  lastSyncedAt: string | null;
}

/** Look up the Immich asset ID for an Oriana media ID. Returns null if not mapped. */
export async function getImmichAssetId(
  client: SupabaseClient,
  orianaMediaId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("immich_asset_mapping")
    .select("immich_asset_id")
    .eq("oriana_media_id", orianaMediaId)
    .neq("sync_state", "removed")
    .maybeSingle();

  if (error || !data) return null;
  const row = data as { immich_asset_id: string };
  return typeof row.immich_asset_id === "string" ? row.immich_asset_id : null;
}

/** Look up the Oriana media ID for an Immich asset ID. Returns null if not mapped. */
export async function getOrianaMediaId(
  client: SupabaseClient,
  immichAssetId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("immich_asset_mapping")
    .select("oriana_media_id")
    .eq("immich_asset_id", immichAssetId)
    .neq("sync_state", "removed")
    .maybeSingle();

  if (error || !data) return null;
  const row = data as { oriana_media_id: string };
  return typeof row.oriana_media_id === "string" ? row.oriana_media_id : null;
}

/**
 * Upsert a mapping. Idempotent.
 * Does not automatically publish Oriana media.
 */
export async function upsertImmichMapping(
  client: SupabaseClient,
  orianaMediaId: string,
  immichAssetId: string,
): Promise<void> {
  await client
    .from("immich_asset_mapping")
    .upsert(
      {
        oriana_media_id: orianaMediaId,
        immich_asset_id: immichAssetId,
        sync_state: "synced",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "oriana_media_id" },
    );
}

/** Mark a mapping as removed (does not delete Oriana or Immich data). */
export async function removeImmichMapping(
  client: SupabaseClient,
  orianaMediaId: string,
): Promise<void> {
  await client
    .from("immich_asset_mapping")
    .update({ sync_state: "removed", updated_at: new Date().toISOString() })
    .eq("oriana_media_id", orianaMediaId);
}
