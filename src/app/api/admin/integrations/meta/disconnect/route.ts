import { NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { logAuditEvent } from "@/lib/audit";

const schema = z.object({ confirm: z.literal(true) });

export async function POST(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can disconnect Facebook.", 403);
  const rateLimit = await enforceRateLimit({ request, session: database.session, policy: { action: "meta_disconnect", limit: 5, windowSeconds: 3600 } });
  if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Try disconnecting again later.", 429, { retryAfterSeconds: rateLimit.retryAfterSeconds });
  try {
    schema.parse(await request.json());
    const { data: connection, error } = await database.client.from("meta_page_connections").update({
      encrypted_page_access_token: "revoked", connection_status: "disconnected", last_error_code: null,
      last_error_message: "Disconnected by Founder.",
    }).eq("provider", "facebook").eq("is_active", true).select("id").maybeSingle();
    if (error) throw error;
    if (!connection) return apiError("NOT_FOUND", "No Facebook Page is connected.", 404);
    await logAuditEvent({ request, session: database.session, action: "meta_disconnected", targetType: "meta_connection", targetId: connection.id });
    revalidateTag("meta-connection", "max"); revalidateTag("meta-feed", "max"); revalidateTag("landing-page", "max"); revalidatePath("/");
    return apiSuccess({ disconnected: true });
  } catch (error) { return toServerError(error, request, "api.meta.disconnect"); }
}
