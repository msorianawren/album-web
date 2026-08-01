import { createPublicServerClient } from "@/lib/db/public";
import type { AdminStory } from "@/lib/types";

export async function getLandingAdminStories(selectedIds: string[]): Promise<AdminStory[]> {
  if (!selectedIds.length) return [];
  const { data, error } = await createPublicServerClient()
    .from("admin_stories")
    .select("*")
    .in("id", selectedIds)
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  
  if (error || !data) return [];
  return data as AdminStory[];
}
