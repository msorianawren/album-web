import { NextRequest } from "next/server";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { syncMetaPageFeed } from "@/lib/meta/sync";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can synchronize Facebook videos.", 403);
  const rateLimit = await enforceRateLimit({ request, session: database.session, policy: { action: "meta_sync", limit: 12, windowSeconds: 3600 } });
  if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Try synchronizing again later.", 429, { retryAfterSeconds: rateLimit.retryAfterSeconds });
  try {
    const { data: connection } = await database.client.from("meta_page_connections").select("id").eq("provider", "facebook").eq("is_active", true).maybeSingle();
    if (!connection) return apiError("NOT_FOUND", "Connect a Facebook Page before synchronizing.", 404);
    const result = await syncMetaPageFeed(database.client, connection.id);
    await logAuditEvent({ request, session: database.session, action: "meta_feed_synced", targetType: "meta_connection", targetId: connection.id, metadata: result });
    return apiSuccess(result);
  } catch (error) { return toServerError(error, request, "api.meta.sync"); }
}
