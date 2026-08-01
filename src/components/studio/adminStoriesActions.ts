"use server";

import { requireAdmin } from "@/lib/auth";
import { createPublicServerClient } from "@/lib/db/public";
import type { AdminStory } from "@/lib/types";

export async function createAdminStory(videoUrl: string, posterUrl: string): Promise<AdminStory> {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("admin_stories")
    .insert({
      video_url: videoUrl,
      poster_url: posterUrl,
      title: "",
      is_available: true,
      created_by: session.userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AdminStory;
}

export async function deleteAdminStory(id: string): Promise<void> {
  const session = await requireAdmin();
  if (!session) throw new Error("Unauthorized");

  const supabase = createPublicServerClient();
  const { error } = await supabase
    .from("admin_stories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function fetchAdminStories(): Promise<AdminStory[]> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("admin_stories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as AdminStory[]) || [];
}