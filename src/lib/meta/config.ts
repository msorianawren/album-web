import "server-only";

const graphApiVersion = process.env.META_GRAPH_API_VERSION?.trim() || "v25.0";

export const metaConfig = {
  graphApiVersion: graphApiVersion.startsWith("v") ? graphApiVersion : `v${graphApiVersion}`,
  appId: process.env.META_APP_ID?.trim() || "",
  appSecret: process.env.META_APP_SECRET?.trim() || "",
  redirectUri: process.env.META_OAUTH_REDIRECT_URI?.trim() || "",
  tokenKeyVersion: process.env.META_TOKEN_KEY_VERSION?.trim() || "v1",
  tokenEncryptionKey: process.env.META_TOKEN_ENCRYPTION_KEY?.trim() || "",
};

export const META_REQUIRED_SCOPES = ["pages_show_list", "pages_read_engagement"] as const;

export function isMetaConfigured() {
  return Boolean(
    metaConfig.appId &&
      metaConfig.appSecret &&
      metaConfig.redirectUri &&
      metaConfig.tokenEncryptionKey,
  );
}
