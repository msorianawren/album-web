import "server-only";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { LandingMetaFeedSettings } from "@/lib/types";
import type { MetaFeedItem, MetaPageConnectionSummary } from "@/lib/meta/types";

const feedColumns = "id,connection_id,provider_item_id,post_id,video_id,item_type,message,title,permalink_url,embed_url,thumbnail_url,width,height,duration_seconds,published_at,is_public,is_available";
const connectionColumns = "id,provider,page_id,page_name,page_picture_url,token_expires_at,granted_scopes,connected_by,connection_status,last_sync_at,last_successful_sync_at,last_error_code,last_error_message,created_at,updated_at";

export async function getMetaConnection() {
  const { data } = await supabase.from("meta_page_connections").select(connectionColumns).eq("provider", "facebook").eq("is_active", true).maybeSingle();
  return (data ?? null) as MetaPageConnectionSummary | null;
}

export async function listMetaFeedItems(query?: { search?: string; page?: number; limit?: number }) {
  const page = Math.max(1, query?.page ?? 1);
  const limit = Math.min(50, Math.max(1, query?.limit ?? 24));
  let request = supabase.from("meta_feed_items").select(feedColumns, { count: "exact" }).order("published_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
  if (query?.search?.trim()) request = request.ilike("message", `%${query.search.trim().replace(/[%_]/g, "")}%`);
  const { data, count, error } = await request;
  if (error) throw error;
  return { items: (data ?? []) as MetaFeedItem[], total: count ?? 0, page, limit };
}

export const getLandingMetaFeedItems = unstable_cache(async (selectedIds: string[], autoFillLatest = false, maxItems = 6) => {
  const ids = selectedIds.slice(0, 6);
  const { data, error } = ids.length
    ? await supabase.from("meta_feed_items").select(feedColumns).in("id", ids).eq("is_public", true).eq("is_available", true)
    : { data: [], error: null };
  if (error) return [];
  const items = new Map((data ?? []).map((item) => [item.id, item as MetaFeedItem]));
  const ordered = ids.flatMap((id) => items.get(id) ? [items.get(id)!] : []);
  if (!autoFillLatest || ordered.length >= maxItems) return ordered.slice(0, maxItems);
  const { data: recent } = await supabase.from("meta_feed_items").select(feedColumns).eq("is_public", true).eq("is_available", true).order("published_at", { ascending: false }).limit(maxItems);
  for (const item of (recent ?? []) as MetaFeedItem[]) {
    if (!items.has(item.id)) ordered.push(item);
    if (ordered.length >= maxItems) break;
  }
  return ordered;
}, ["meta-feed-landing"], { tags: ["meta-feed"], revalidate: 3600 });

export function metaFeedDisplayItems(settings: LandingMetaFeedSettings, items: MetaFeedItem[]) {
  const selected = new Map(items.map((item) => [item.id, item]));
  const ordered = settings.selectedItemIds.flatMap((id) => selected.get(id) ? [selected.get(id)!] : []);
  return ordered.slice(0, settings.maxItems);
}
