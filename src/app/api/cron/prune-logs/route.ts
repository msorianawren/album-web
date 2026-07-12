import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSiteSettings } from "@/lib/site-settings";

export async function GET(request: NextRequest) {
  // Protect the cron endpoint. Vercel sets an Authorization header with a Bearer token matching CRON_SECRET.
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (process.env.VERCEL_ENV === "production" && authHeader !== expectedAuth) {
    return apiError("UNAUTHENTICATED", "Invalid cron secret.", 401);
  }

  try {
    const settings = await getSiteSettings();

    // 1. Delete audit logs older than 6 days
    const logCutoffDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const { count: logCount, error: logError } = await supabase
      .from("audit_logs")
      .delete({ count: "exact" })
      .lt("created_at", logCutoffDate);

    if (logError) throw new Error(logError.message);

    // 2. Delete spam contact messages
    const spamCutoffDate = new Date(Date.now() - settings.spam_retention_days * 24 * 60 * 60 * 1000).toISOString();
    const { count: spamCount, error: spamError } = await supabase
      .from("contact_messages")
      .delete({ count: "exact" })
      .eq("status", "spam")
      .lt("created_at", spamCutoffDate);

    if (spamError) throw new Error(spamError.message);

    // 3. Delete deleted contact messages
    const deletedCutoffDate = new Date(Date.now() - settings.deleted_message_retention_days * 24 * 60 * 60 * 1000).toISOString();
    const { count: deletedCount, error: deletedError } = await supabase
      .from("contact_messages")
      .delete({ count: "exact" })
      .eq("status", "deleted")
      .lt("deleted_at", deletedCutoffDate);

    if (deletedError) throw new Error(deletedError.message);

    return apiSuccess({ 
      deleted_logs: logCount ?? 0, 
      deleted_spam: spamCount ?? 0, 
      deleted_messages: deletedCount ?? 0, 
      status: "Pruning complete" 
    });
  } catch (error) {
    return toServerError(error);
  }
}
