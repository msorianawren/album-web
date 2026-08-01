import { createPublicServerClient } from "@/lib/db/public";
import type { PublicAdminStory } from "@/lib/types";

const publicStoryColumns = "id,video_url,poster_url,caption,mime_type,width,height,duration_seconds,sort_order";

export async function getLandingAdminStories(): Promise<PublicAdminStory[]> {
  const { data, error } = await createPublicServerClient()
    .from("admin_stories")
    .select(publicStoryColumns)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  
  if (error) throw error;
  return data as PublicAdminStory[];
}
