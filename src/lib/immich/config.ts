/**
 * Immich service adapter configuration.
 *
 * Server-only. Never import this file from client code or NEXT_PUBLIC_* env vars.
 * Real values must not be committed; only names appear here and in .env.example.
 */
import "server-only";

export interface ImmichConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  syncSecret: string;
}

let _config: ImmichConfig | null = null;

export function getImmichConfig(): ImmichConfig {
  if (_config) return _config;

  const enabled = process.env.IMMICH_ENABLED === "true";
  const baseUrl = (process.env.IMMICH_BASE_URL ?? "").trim().replace(/\/$/, "");
  const apiKey = (process.env.IMMICH_API_KEY ?? "").trim();
  const timeoutMs = Number(process.env.IMMICH_REQUEST_TIMEOUT_MS ?? "5000") || 5000;
  const syncSecret = (process.env.IMMICH_SYNC_SECRET ?? "").trim();

  _config = { enabled, baseUrl, apiKey, timeoutMs, syncSecret };
  return _config;
}

export function isImmichEnabled(): boolean {
  return getImmichConfig().enabled;
}
