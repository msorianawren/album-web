/**
 * Narrow typed HTTP client for the Immich API.
 *
 * Server-only. API key never reaches client bundles.
 *
 * Design principles:
 *   - Explicit timeout via AbortController.
 *   - Content-type validation before Zod parse.
 *   - Sanitized errors (no credential echo).
 *   - No arbitrary upstream URL supplied by browser input.
 *   - Bounded retry (none by default; callers may retry once).
 */
import "server-only";
import type { ZodSchema } from "zod";
import { getImmichConfig } from "@/lib/immich/config";

export class ImmichClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly isNetwork = false,
  ) {
    super(message);
    this.name = "ImmichClientError";
  }
}

function sanitizeBaseUrl(raw: string): string {
  // Only allow http/https schemes; reject anything else
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new ImmichClientError("Immich base URL must use http or https");
    }
    return parsed.origin;
  } catch (error) {
    if (error instanceof ImmichClientError) throw error;
    throw new ImmichClientError("Invalid Immich base URL");
  }
}

async function immichFetch<T>(
  path: string,
  schema: ZodSchema<T>,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const config = getImmichConfig();

  if (!config.enabled) {
    throw new ImmichClientError("Immich integration is disabled");
  }
  if (!config.baseUrl) {
    throw new ImmichClientError("IMMICH_BASE_URL is not configured");
  }
  if (!config.apiKey) {
    throw new ImmichClientError("IMMICH_API_KEY is not configured");
  }

  const baseUrl = sanitizeBaseUrl(config.baseUrl);
  const timeoutMs = options.timeoutMs ?? config.timeoutMs;
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "x-api-key": config.apiKey,
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      // Never echo API key or internal URL details
      throw new ImmichClientError(
        `Immich API returned ${response.status}`,
        response.status,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new ImmichClientError("Immich API returned unexpected content type");
    }

    const json: unknown = await response.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ImmichClientError("Immich API response validation failed");
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof ImmichClientError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ImmichClientError(`Immich API request timed out after ${timeoutMs}ms`, undefined, true);
    }
    throw new ImmichClientError("Immich API network error", undefined, true);
  } finally {
    clearTimeout(timerId);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

import {
  ImmichServerInfoSchema,
  ImmichAssetResponseDtoSchema,
  ImmichAlbumResponseDtoSchema,
  ImmichSearchResponseSchema,
  type ImmichAssetResponseDto,
  type ImmichAlbumResponseDto,
  type ImmichSearchResponse,
  type ImmichServerVersion,
} from "@/lib/immich/dtos";


/** Check Immich server health and version. */
export async function immichGetServerVersion(): Promise<ImmichServerVersion | null> {
  try {
    const info = await immichFetch(
      "/api/server/version",
      ImmichServerInfoSchema,
    );
    return info.version ?? null;
  } catch {
    return null;
  }
}

/** Fetch a single asset by Immich asset ID. */
export async function immichGetAsset(
  assetId: string,
): Promise<ImmichAssetResponseDto | null> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(assetId)) return null;
  try {
    return await immichFetch(
      `/api/assets/${encodeURIComponent(assetId)}`,
      ImmichAssetResponseDtoSchema,
    );
  } catch {
    return null;
  }
}

/** Fetch all assets for an Immich album. */
export async function immichGetAlbum(
  albumId: string,
  withAssets = false,
): Promise<ImmichAlbumResponseDto | null> {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(albumId)) return null;
  try {
    return await immichFetch(
      `/api/albums/${encodeURIComponent(albumId)}?withoutAssets=${!withAssets}`,
      ImmichAlbumResponseDtoSchema,
    );
  } catch {
    return null;
  }
}

/** Paginated smart search on Immich. */
export async function immichSearch(params: {
  query: string;
  albumId?: string;
  page?: number;
  size?: number;
}): Promise<ImmichSearchResponse | null> {
  try {
    const { query, albumId, page = 1, size = 50 } = params;
    const body: Record<string, unknown> = {
      query,
      page,
      size: Math.min(size, 250),
    };
    if (albumId) body.albumIds = [albumId];

    return await immichFetch("/api/search/smart", ImmichSearchResponseSchema, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return null;
  }
}

/** Fetch thumbnail bytes from Immich for a single asset. */
export async function immichGetThumbnailUrl(
  assetId: string,
  size: "thumbnail" | "preview" = "thumbnail",
): Promise<string> {
  // Returns a proxied API route path, not the Immich URL itself
  return `/api/immich/thumbnail/${encodeURIComponent(assetId)}?size=${size}`;
}
