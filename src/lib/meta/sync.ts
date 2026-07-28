import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MetaApiError, metaGraphRequestWithRetry } from "@/lib/meta/client";
import { decryptMetaToken } from "@/lib/meta/token-vault";
import { normalizeMetaVideo } from "@/lib/meta/feed-normalizer";

const MISSING_THRESHOLD = 3;
const PAGE_SIZE = 50;

type ConnectionRow = {
  id: string;
  page_id: string;
  encrypted_page_access_token: string;
};

type GraphPage = { data?: Array<Record<string, unknown>>; paging?: { next?: string } };

function sanitizeMetaError(error: unknown) {
  if (error instanceof MetaApiError) return { code: error.code, message: error.message };
  return { code: "SYNC_FAILED", message: "The video feed could not be synchronized." };
}

async function fetchCollection(path: string, token: string) {
  const collected: Array<Record<string, unknown>> = [];
  let cursor: string | undefined;
  for (let page = 0; page < 6; page += 1) {
    const result = await metaGraphRequestWithRetry<GraphPage>(path, {
      fields: "id,post_id,description,title,permalink_url,picture,created_time,length,format,width,height,privacy,is_live_streaming,live_status,media_type",
      limit: PAGE_SIZE,
      after: cursor,
    }, token);
    collected.push(...(result.data ?? []));
    const next = result.paging?.next;
    if (!next) break;
    try { cursor = new URL(next).searchParams.get("after") ?? undefined; } catch { break; }
    if (!cursor) break;
  }
  return collected;
}

export async function syncMetaPageFeed(client: SupabaseClient, connectionId: string) {
  const { data, error } = await client
    .from("meta_page_connections")
    .select("id,page_id,encrypted_page_access_token")
    .eq("id", connectionId)
    .eq("connection_status", "connected")
    .maybeSingle();
  if (error || !data) throw new Error("Active Meta connection not found.");
  const connection = data as ConnectionRow;
  const token = decryptMetaToken(connection.encrypted_page_access_token);
  const syncStartedAt = new Date().toISOString();
  try {
    const [videos, reels] = await Promise.all([
      fetchCollection(`${connection.page_id}/videos`, token),
      fetchCollection(`${connection.page_id}/video_reels`, token).catch((error) => {
        if (error instanceof MetaApiError && [400, 403, 404].includes(error.status)) return [];
        throw error;
      }),
    ]);
    const normalized = [...videos, ...reels]
      .map((raw) => normalizeMetaVideo(raw, connection.page_id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item && item.isPublic));
    const unique = new Map(normalized.map((item) => [item.providerItemId, item]));
    const rows = [...unique.values()].map((item) => ({
      connection_id: connection.id,
      provider_item_id: item.providerItemId,
      post_id: item.postId,
      video_id: item.videoId,
      item_type: item.itemType,
      message: item.message,
      title: item.title,
      permalink_url: item.permalinkUrl,
      embed_url: item.embedUrl,
      thumbnail_url: item.thumbnailUrl,
      width: item.width,
      height: item.height,
      duration_seconds: item.durationSeconds,
      published_at: item.publishedAt,
      is_public: item.isPublic,
      is_available: true,
      consecutive_missing_syncs: 0,
      raw_metadata: item.rawMetadata,
      last_seen_at: syncStartedAt,
      synced_at: syncStartedAt,
    }));
    if (rows.length) {
      const { error: upsertError } = await client.from("meta_feed_items").upsert(rows, { onConflict: "connection_id,provider_item_id" });
      if (upsertError) throw upsertError;
    }
    const seenIds = rows.map((row) => row.provider_item_id);
    if (seenIds.length) {
      const { data: missing, error: missingError } = await client
        .from("meta_feed_items")
        .select("id,consecutive_missing_syncs")
        .eq("connection_id", connection.id)
        .not("provider_item_id", "in", `(${seenIds.map((id) => `"${id.replace(/"/g, "")}"`).join(",")})`);
      if (missingError) throw missingError;
      await Promise.all((missing ?? []).map((item) => {
        const misses = Number(item.consecutive_missing_syncs ?? 0) + 1;
        return client.from("meta_feed_items").update({
          consecutive_missing_syncs: misses,
          is_available: misses < MISSING_THRESHOLD,
          synced_at: syncStartedAt,
        }).eq("id", item.id);
      }));
    }
    await client.from("meta_page_connections").update({
      last_sync_at: syncStartedAt,
      last_successful_sync_at: syncStartedAt,
      last_error_code: null,
      last_error_message: null,
      connection_status: "connected",
    }).eq("id", connection.id);
    revalidateTag("meta-feed", "max");
    revalidateTag("meta-connection", "max");
    revalidateTag("landing-page", "max");
    revalidatePath("/");
    return { synced: rows.length };
  } catch (error) {
    const metaError = sanitizeMetaError(error);
    const status = metaError.code === "190" || metaError.code === "102" ? "needs_attention" : "connected";
    await client.from("meta_page_connections").update({
      last_sync_at: syncStartedAt,
      last_error_code: metaError.code,
      last_error_message: metaError.message,
      connection_status: status,
    }).eq("id", connection.id);
    throw error;
  }
}
