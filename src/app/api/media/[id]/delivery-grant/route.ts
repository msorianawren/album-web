import { NextRequest, NextResponse } from "next/server";
import { apiError, toServerError } from "@/lib/errors";
import { getPresignedGetUrl } from "@/lib/r2";
import { authorizePrivateMediaAsset, type PrivateMediaVariant } from "@/lib/private-media";
import { isMediaUuid } from "@/lib/private-media-range";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const viewerVariants = new Set<PrivateMediaVariant>(["thumbnail", "medium", "poster", "display"]);

function directDeliveryEnabled() {
  return process.env.PRIVATE_MEDIA_DIRECT_DELIVERY_ENABLED === "true";
}

function proxyFallbackEnabled() {
  return process.env.PRIVATE_MEDIA_PROXY_FALLBACK_ENABLED !== "false";
}

function ttlFor(variant: PrivateMediaVariant) {
  const configured = Number(process.env.PRIVATE_MEDIA_SIGNED_URL_TTL_SECONDS ?? 120);
  const defaultTtl = variant === "display" ? 120 : variant === "medium" ? 180 : 240;
  return Math.min(300, Math.max(60, Number.isFinite(configured) ? configured : defaultTtl));
}

interface DeliveryGrantProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: DeliveryGrantProps) {
  try {
    if (!directDeliveryEnabled()) return apiError("NOT_FOUND", "Direct media delivery is unavailable.", 404);
    const { id } = await params;
    if (!isMediaUuid(id)) return apiError("NOT_FOUND", "Media not found.", 404);
    const body = await request.json().catch(() => null);
    const variant = body && typeof body.variant === "string" ? body.variant as PrivateMediaVariant : "medium";
    if (!viewerVariants.has(variant)) return apiError("INVALID_INPUT", "Unsupported media variant.", 400);

    const asset = await authorizePrivateMediaAsset(request, id, variant);
    if (!asset) return apiError("NOT_FOUND", "Media not found.", 404);

    const expiresIn = ttlFor(variant);
    const url = await getPresignedGetUrl({
      key: asset.objectKey,
      bucketRole: asset.bucketRole,
      expiresIn,
    });

    return NextResponse.json(
      {
        url,
        variant,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        contentType: asset.contentType,
        width: asset.width,
        height: asset.height,
        allowProxyFallback: proxyFallbackEnabled(),
      },
      { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization" } },
    );
  } catch (error) {
    return toServerError(error, request, "api.private_media.delivery_grant");
  }
}
