import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { META_REQUIRED_SCOPES, metaConfig } from "@/lib/meta/config";
import { metaGraphRequest } from "@/lib/meta/client";
import type { MetaPageOption } from "@/lib/meta/types";

export function createMetaOauthState() { return randomBytes(32).toString("base64url"); }
export function hashMetaOauthState(state: string) { return createHash("sha256").update(state).digest("hex"); }

export function metaOAuthAuthorizeUrl(state: string) {
  const url = new URL(`https://www.facebook.com/${metaConfig.graphApiVersion}/dialog/oauth`);
  url.searchParams.set("client_id", metaConfig.appId);
  url.searchParams.set("redirect_uri", metaConfig.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", META_REQUIRED_SCOPES.join(","));
  return url.toString();
}

export async function exchangeMetaCode(code: string) {
  const payload = await metaGraphRequest<{ access_token: string; expires_in?: number }>("oauth/access_token", {
    client_id: metaConfig.appId,
    client_secret: metaConfig.appSecret,
    redirect_uri: metaConfig.redirectUri,
    code,
  });
  return payload;
}

export async function getMetaManagedPages(userToken: string): Promise<Array<MetaPageOption & { accessToken: string }>> {
  const payload = await metaGraphRequest<{ data?: Array<{ id?: string; name?: string; access_token?: string; picture?: { data?: { url?: string } } }> }>(
    "me/accounts", { fields: "id,name,access_token,picture" }, userToken,
  );
  return (payload.data ?? []).flatMap((page) => page.id && page.name && page.access_token ? [{
    id: page.id,
    name: page.name,
    accessToken: page.access_token,
    pictureUrl: typeof page.picture?.data?.url === "string" ? page.picture.data.url : null,
  }] : []);
}
