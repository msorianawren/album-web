import { NextRequest, NextResponse } from "next/server";
import { apiError, toServerError } from "@/lib/errors";
import {
  authorizePrivateMediaAsset,
  type PrivateMediaVariant,
} from "@/lib/private-media";
import { isMediaUuid } from "@/lib/private-media-range";
import { getPresignedGetUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const browserVariants = new Set<PrivateMediaVariant>(["thumbnail", "card", "medium", "poster", "display", "original"]);

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

    if (asset.bucketRole === "public" && process.env.R2_PUBLIC_URL) {
      const publicBase = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
      return NextResponse.redirect(`${publicBase}/${asset.objectKey}`);
    }

    try {
      const signedUrl = await getPresignedGetUrl({
        key: asset.objectKey,
        expiresIn: 3600,
        bucketRole: asset.bucketRole,
      });
      return NextResponse.redirect(signedUrl);
    } catch {
      if (process.env.R2_PUBLIC_URL) {
        const publicBase = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
        return NextResponse.redirect(`${publicBase}/${asset.objectKey}`);
      }
      throw new Error("Unable to resolve asset URL");
    }
  } catch (error) {
    return toServerError(error, request, "api.private_media.content");
  }
}
