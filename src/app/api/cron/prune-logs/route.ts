import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  // Protect the cron endpoint. Vercel sets an Authorization header with a Bearer token matching CRON_SECRET.
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (process.env.VERCEL_ENV === "production" && authHeader !== expectedAuth) {
    return apiError("UNAUTHENTICATED", "Invalid cron secret.", 401);
  }

  try {
    // Delete logs older than 6 days
    const cutoffDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    
    const { count, error } = await supabase
      .from("audit_logs")
      .delete({ count: "exact" })
      .lt("created_at", cutoffDate);

    if (error) {
      throw new Error(error.message);
    }

    return apiSuccess({ deleted_count: count ?? 0, status: "Pruning complete" });
  } catch (error) {
    return toServerError(error);
  }
}
