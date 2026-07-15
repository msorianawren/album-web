import { NextRequest } from "next/server";
import { apiError, toServerError } from "@/lib/errors";
import {
  authorizePrivateMediaAsset,
  streamAuthorizedPrivateMedia,
  type PrivateMediaVariant,
} from "@/lib/private-media";
import { isMediaUuid, parseSingleByteRange } from "@/lib/private-media-range";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const browserVariants = new Set<PrivateMediaVariant>(["thumbnail", "medium", "poster", "display"]);

interface PrivateMediaContentProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: PrivateMediaContentProps) {
  try {
    const { id } = await params;
    if (!isMediaUuid(id)) return apiError("NOT_FOUND", "Media not found.", 404);
    const variant = (request.nextUrl.searchParams.get("variant") ?? "display") as PrivateMediaVariant;
    if (!browserVariants.has(variant)) {
      return apiError("INVALID_INPUT", "Unsupported private media variant.", 400);
    }

    const asset = await authorizePrivateMediaAsset(request, id, variant);
    if (!asset) return apiError("NOT_FOUND", "Media not found.", 404);

    const range = parseSingleByteRange(request.headers.get("range"));
    if (range === null) {
      return new Response(null, {
        status: 416,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const object = await streamAuthorizedPrivateMedia(asset, range);
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": object.contentType ?? asset.contentType ?? "application/octet-stream",
      "Vary": "Cookie, Authorization, Range",
      "X-Content-Type-Options": "nosniff",
    });
    if (process.env.NODE_ENV !== "production" || process.env.ORIANA_MEDIA_DEBUG_HEADERS === "1") {
      headers.set(
        "X-Oriana-Media-Result",
        asset.deliverySource === "private_manifest" ? "manifest" : "legacy-fallback",
      );
    }
    if (object.contentLength !== undefined) headers.set("Content-Length", String(object.contentLength));
    if (object.contentRange) headers.set("Content-Range", object.contentRange);

    return new Response(object.body, {
      status: object.contentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    return toServerError(error, request, "api.private_media.content");
  }
}
