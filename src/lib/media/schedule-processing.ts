import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reportAppFailure, toAppFailure } from "@/lib/app-failure";
import { processQueuedImageJobs } from "@/lib/media/processing-jobs";

export function scheduleQueuedImageProcessing(client: SupabaseClient, batchSize = 2) {
  after(async () => {
    try {
      await processQueuedImageJobs(client, batchSize);
    } catch (error) {
      reportAppFailure(toAppFailure(error, "media.processing.after_upload"));
    }
  });
}
