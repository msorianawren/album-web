"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function updateMessageStatus(id: string, status: string) {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (status === "archived") updates.archived_at = new Date().toISOString();
  if (status === "deleted") updates.deleted_at = new Date().toISOString();

  const { error } = await supabase
    .from("contact_messages")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/studio/messages");
}
