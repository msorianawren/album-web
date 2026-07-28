import "server-only";
import { metaConfig } from "@/lib/meta/config";

export class MetaApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
  }
}

function safeGraphMessage(value: unknown) {
  const message = typeof value === "string" ? value : "Meta request failed.";
  return message.replace(/access_token=[^&\s]+/gi, "access_token=[redacted]").slice(0, 280);
}

export async function metaGraphRequest<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  accessToken?: string,
  timeoutMs = 12_000,
): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${metaConfig.graphApiVersion}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  if (accessToken) url.searchParams.set("access_token", accessToken);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    const payload = (await response.json().catch(() => ({}))) as { error?: { code?: number; message?: string; type?: string } };
    if (!response.ok || payload.error) {
      const code = String(payload.error?.code ?? response.status);
      throw new MetaApiError(code, safeGraphMessage(payload.error?.message), response.status);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof MetaApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new MetaApiError("TIMEOUT", "Meta request timed out.", 504);
    throw new MetaApiError("NETWORK", "Meta could not be reached.", 503);
  } finally {
    clearTimeout(timer);
  }
}

export async function metaGraphRequestWithRetry<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  accessToken?: string,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await metaGraphRequest<T>(path, params, accessToken);
    } catch (error) {
      lastError = error;
      if (!(error instanceof MetaApiError) || ![429, 500, 502, 503, 504].includes(error.status)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt + Math.floor(Math.random() * 125)));
    }
  }
  throw lastError;
}
