import "server-only";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { FacebookFeedItem } from "@/lib/facebook-feed/types";

export const facebookFeedColumns = "id,provider,source_url,canonical_url,embed_kind,title,caption,poster_url,poster_alt,published_at,width,height,aspect_ratio,is_available,availability_note,created_at,updated_at";
const publicColumns = "id,provider,canonical_url,embed_kind,title,caption,poster_url,poster_alt,published_at,width,height,aspect_ratio";

export async function listFacebookFeedItems(client: SupabaseClient, query?: { search?: string; page?: number; limit?: number }) {
  const page = Math.max(1, query?.page ?? 1);
  const limit = Math.min(50, Math.max(1, query?.limit ?? 24));
  let request = client.from("social_embed_items").select(facebookFeedColumns, { count: "exact" }).eq("provider", "facebook").order("published_at", { ascending: false, nullsFirst: false }).range((page - 1) * limit, page * limit - 1);
  if (query?.search?.trim()) {
    const search = query.search.trim().replace(/[%_,()]/g, "");
    request = request.or(`title.ilike.%${search}%,caption.ilike.%${search}%,canonical_url.ilike.%${search}%`);
  }
  const { data, count, error } = await request;
  if (error) throw error;
  return { items: (data ?? []) as FacebookFeedItem[], total: count ?? 0, page, limit };
}

export const getLandingFacebookFeedItems = unstable_cache(async (selectedIds: string[]) => {
  const ids = selectedIds.slice(0, 6);
  if (!ids.length) return [] as FacebookFeedItem[];
  const { data, error } = await supabase.from("social_embed_items").select(publicColumns).eq("provider", "facebook").eq("is_available", true).in("id", ids);
  if (error) return [];
  const byId = new Map((data ?? []).map((item) => [item.id, item as FacebookFeedItem]));
  return ids.flatMap((id) => byId.get(id) ? [byId.get(id)!] : []);
}, ["facebook-curated-feed"], { tags: ["facebook-curated-feed"], revalidate: 3600 });
