import { NextRequest, NextResponse } from "next/server";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError } from "@/lib/errors";
import { isMetaConfigured } from "@/lib/meta/config";
import { createMetaOauthState, hashMetaOauthState, metaOAuthAuthorizeUrl } from "@/lib/meta/oauth";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can connect Facebook.", 403);
  if (!isMetaConfigured()) return apiError("CONFLICT", "Meta integration is not configured yet.", 409);
  const rateLimit = await enforceRateLimit({ request, session: database.session, policy: { action: "meta_connect", limit: 5, windowSeconds: 3600 } });
  if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Try connecting again later.", 429, { retryAfterSeconds: rateLimit.retryAfterSeconds });
  const state = createMetaOauthState();
  await database.client.from("meta_oauth_states").delete().eq("actor_user_id", database.session.userId);
  const { error } = await database.client.from("meta_oauth_states").insert({
    state_hash: hashMetaOauthState(state), actor_user_id: database.session.userId, expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) return apiError("SERVER_ERROR", "Could not prepare Facebook authorization.", 500);
  await logAuditEvent({ request, session: database.session, action: "meta_connect_started", targetType: "meta_connection" });
  return NextResponse.redirect(metaOAuthAuthorizeUrl(state), { headers: { "Cache-Control": "no-store" } });
}
