import { NextRequest } from "next/server";
import { classifyDataFailure } from "@/lib/app-failure";
import { getTrustedWorkerDatabase } from "@/lib/db/worker";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSiteSettings } from "@/lib/site-settings";

export async function GET(request: NextRequest) {
  const database = getTrustedWorkerDatabase(request, "log-retention");
  if (!database) {
    return apiError("UNAUTHENTICATED", "Invalid cron secret.", 401);
  }
  const { client } = database;

  try {
    const settings = await getSiteSettings();

    // 1. Delete audit logs older than 6 days
    const logCutoffDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const { count: logCount, error: logError } = await client
      .from("audit_logs")
      .delete({ count: "exact" })
      .lt("created_at", logCutoffDate);

    if (logError) throw classifyDataFailure(logError, "cron.prune_audit_logs");

    // 2. Delete spam contact messages
    const spamCutoffDate = new Date(Date.now() - settings.spam_retention_days * 24 * 60 * 60 * 1000).toISOString();
    const { count: spamCount, error: spamError } = await client
      .from("contact_messages")
      .delete({ count: "exact" })
      .eq("status", "spam")
      .lt("created_at", spamCutoffDate);

    if (spamError) throw classifyDataFailure(spamError, "cron.prune_spam_messages");

    // 3. Delete deleted contact messages
    const deletedCutoffDate = new Date(Date.now() - settings.deleted_message_retention_days * 24 * 60 * 60 * 1000).toISOString();
    const { count: deletedCount, error: deletedError } = await client
      .from("contact_messages")
      .delete({ count: "exact" })
      .eq("status", "deleted")
      .lt("deleted_at", deletedCutoffDate);

    if (deletedError) throw classifyDataFailure(deletedError, "cron.prune_deleted_messages");

    return apiSuccess({ 
      deleted_logs: logCount ?? 0, 
      deleted_spam: spamCount ?? 0, 
      deleted_messages: deletedCount ?? 0, 
      status: "Pruning complete" 
    });
  } catch (error) {
    return toServerError(error, request, "api.cron.prune_logs");
  }
}
