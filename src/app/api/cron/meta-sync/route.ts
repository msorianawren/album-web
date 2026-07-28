import { NextRequest } from "next/server";
import { getTrustedWorkerDatabase } from "@/lib/db/worker";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { syncMetaPageFeed } from "@/lib/meta/sync";

export async function GET(request: NextRequest) {
  const database = getTrustedWorkerDatabase(request, "meta-sync");
  if (!database) return apiError("UNAUTHENTICATED", "Invalid cron secret.", 401);
  try {
    const { data: connection } = await database.client.from("meta_page_connections").select("id").eq("provider", "facebook").eq("is_active", true).eq("connection_status", "connected").maybeSingle();
    if (!connection) return apiSuccess({ skipped: true });
    return apiSuccess(await syncMetaPageFeed(database.client, connection.id));
  } catch (error) { return toServerError(error, request, "api.cron.meta_sync"); }
}
