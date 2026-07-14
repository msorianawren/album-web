import { NextRequest } from "next/server";
import { apiError, toServerError } from "@/lib/errors";
import {
  authorizePrivateMediaAsset,
  type PrivateMediaVariant,
} from "@/lib/private-media";
import { getR2ObjectStream } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const browserVariants = new Set<PrivateMediaVariant>(["thumbnail", "medium", "poster", "display"]);

interface PrivateMediaContentProps {
  params: Promise<{ id: string }>;
}

function validRange(value: string | null) {
  if (!value) return undefined;
  return /^bytes=\d*-\d*$/.test(value) ? value : null;
}

export async function GET(request: NextRequest, { params }: PrivateMediaContentProps) {
  try {
    const { id } = await params;
    const variant = (request.nextUrl.searchParams.get("variant") ?? "display") as PrivateMediaVariant;
    if (!browserVariants.has(variant)) {
      return apiError("INVALID_INPUT", "Unsupported private media variant.", 400);
    }

    const range = validRange(request.headers.get("range"));
    if (range === null) {
      return new Response(null, {
        status: 416,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const asset = await authorizePrivateMediaAsset(request, id, variant);
    if (!asset) return apiError("NOT_FOUND", "Media not found.", 404);

    const object = await getR2ObjectStream({
      key: asset.objectKey,
      bucketRole: asset.bucketRole,
      range,
    });
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": object.contentType ?? asset.contentType ?? "application/octet-stream",
      "Vary": "Cookie, Authorization, Range",
      "X-Content-Type-Options": "nosniff",
    });
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
