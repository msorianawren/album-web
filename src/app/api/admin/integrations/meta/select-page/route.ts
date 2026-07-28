import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { metaConfig } from "@/lib/meta/config";
import { decryptMetaToken, encryptMetaToken } from "@/lib/meta/token-vault";
import { getMetaManagedPages, hashMetaOauthState } from "@/lib/meta/oauth";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { logAuditEvent } from "@/lib/audit";
import { revalidatePath, revalidateTag } from "next/cache";

const schema = z.object({ pageId: z.string().trim().regex(/^\d{3,40}$/) });

export async function POST(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can choose a Facebook Page.", 403);
  const rateLimit = await enforceRateLimit({ request, session: database.session, policy: { action: "meta_select_page", limit: 10, windowSeconds: 3600 } });
  if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Try selecting a Page again later.", 429, { retryAfterSeconds: rateLimit.retryAfterSeconds });
  try {
    const { pageId } = schema.parse(await request.json());
    const state = (await cookies()).get("meta_oauth_state")?.value;
    if (!state) return apiError("UNAUTHENTICATED", "Facebook authorization has expired. Connect again.", 401);
    const { data: pending } = await database.client.from("meta_oauth_states").select("id,encrypted_user_access_token,expires_at")
      .eq("state_hash", hashMetaOauthState(state)).eq("actor_user_id", database.session.userId).maybeSingle();
    if (!pending?.encrypted_user_access_token || new Date(pending.expires_at).getTime() <= Date.now()) return apiError("UNAUTHENTICATED", "Facebook authorization has expired. Connect again.", 401);
    const page = (await getMetaManagedPages(decryptMetaToken(pending.encrypted_user_access_token))).find((item) => item.id === pageId);
    if (!page) return apiError("FORBIDDEN", "That Facebook Page is no longer available to this account.", 403);
    await database.client.from("meta_page_connections").update({ is_active: false }).eq("provider", "facebook").eq("is_active", true);
    const { data: connection, error } = await database.client.from("meta_page_connections").upsert({
      provider: "facebook", page_id: page.id, page_name: page.name, page_picture_url: page.pictureUrl,
      encrypted_page_access_token: encryptMetaToken(page.accessToken), token_key_version: metaConfig.tokenKeyVersion,
      granted_scopes: ["pages_show_list", "pages_read_engagement"], connected_by: database.session.userId,
      connection_status: "connected", is_active: true, last_error_code: null, last_error_message: null,
    }, { onConflict: "provider,page_id" }).select("id").single();
    if (error || !connection) throw error ?? new Error("Could not save Page connection.");
    await database.client.from("meta_oauth_states").delete().eq("id", pending.id);
    await logAuditEvent({ request, session: database.session, action: "meta_page_selected", targetType: "meta_connection", targetId: connection.id, metadata: { pageId: page.id } });
    revalidateTag("meta-connection", "max"); revalidateTag("meta-feed", "max"); revalidatePath("/");
    const response = apiSuccess({ connectionId: connection.id });
    response.cookies.set("meta_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  } catch (error) { return toServerError(error, request, "api.meta.select_page"); }
}
