import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { isMetaConfigured } from "@/lib/meta/config";
import { decryptMetaToken } from "@/lib/meta/token-vault";
import { getMetaManagedPages, hashMetaOauthState } from "@/lib/meta/oauth";

export async function GET(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can manage Facebook integrations.", 403);
  try {
    const { data: connection } = await database.client
      .from("meta_page_connections")
      .select("id,provider,page_id,page_name,page_picture_url,token_expires_at,granted_scopes,connected_by,connection_status,last_sync_at,last_successful_sync_at,last_error_code,last_error_message,created_at,updated_at")
      .eq("provider", "facebook").eq("is_active", true).maybeSingle();
    const { count } = await database.client.from("meta_feed_items").select("id", { count: "exact", head: true });
    const state = (await cookies()).get("meta_oauth_state")?.value;
    let pages: Array<{ id: string; name: string; pictureUrl: string | null }> = [];
    let pendingPageSelection = false;
    if (state && isMetaConfigured()) {
      const { data: pending } = await database.client.from("meta_oauth_states")
        .select("encrypted_user_access_token,expires_at").eq("state_hash", hashMetaOauthState(state)).eq("actor_user_id", database.session.userId).maybeSingle();
      if (pending?.encrypted_user_access_token && new Date(pending.expires_at).getTime() > Date.now()) {
        pendingPageSelection = true;
        try {
          pages = (await getMetaManagedPages(decryptMetaToken(pending.encrypted_user_access_token))).map((page) => ({ id: page.id, name: page.name, pictureUrl: page.pictureUrl }));
        } catch {
          pages = [];
        }
      }
    }
    return apiSuccess({ configured: isMetaConfigured(), connection: connection ?? null, pendingPageSelection, pages, feedCount: count ?? 0 });
  } catch (error) { return toServerError(error, request, "api.meta.status"); }
}
