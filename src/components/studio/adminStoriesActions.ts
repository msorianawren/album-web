"use server";

import { supabase } from "@/lib/supabase";
import type { AdminStory } from "@/lib/types";

export async function fetchAdminStories(): Promise<AdminStory[]> {
  try {
    const { data } = await supabase
      .from("admin_stories")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as AdminStory[]) ?? [];
  } catch {
    return [];
  }
}

export async function createAdminStory(story: Partial<AdminStory>): Promise<AdminStory | null> {
  try {
    const { data } = await supabase
      .from("admin_stories")
      .insert(story)
      .select()
      .single();
    return data as AdminStory;
  } catch {
    return null;
  }
}

export async function deleteAdminStory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("admin_stories").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}
