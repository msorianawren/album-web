import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { imageMimeTypes } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { putR2Object } from "@/lib/r2";

export const runtime = "nodejs";

function extensionFromMime(mimeType: string) {
  const fallback = mimeType.split("/").at(1) ?? "jpg";
  return fallback.replace("jpeg", "jpg");
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can upload landing assets.", 403);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const slot = String(formData.get("slot") ?? "image").replace(/[^a-z0-9-]/gi, "-");

    if (!(file instanceof File)) {
      return apiError("INVALID_INPUT", "file is required.", 400);
    }

    if (!imageMimeTypes.includes(file.type as (typeof imageMimeTypes)[number])) {
      return apiError("INVALID_INPUT", "Only JPEG, PNG, WebP, and AVIF images are supported.", 400);
    }

    if (file.size > 30 * 1024 * 1024) {
      return apiError("INVALID_INPUT", "Landing images must be 30 MB or smaller.", 400);
    }

    const source = Buffer.from(await file.arrayBuffer());
    const image = sharp(source, { failOn: "none" }).rotate();
    const metadata = await image.metadata();
    const extension = extensionFromMime(file.type);
    const originalKey = `landing/${slot}/${randomUUID()}/original.${extension}`;
    const previewKey = `landing/${slot}/${randomUUID()}/preview.webp`;

    const preview = await image
      .clone()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();

    const [url, previewUrl] = await Promise.all([
      putR2Object({
        key: originalKey,
        body: source,
        contentType: file.type,
        cacheControl: "public, max-age=86400",
      }),
      putR2Object({
        key: previewKey,
        body: preview,
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      }),
    ]);

    return apiSuccess(
      {
        asset: {
          url,
          previewUrl,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return toServerError(error);
  }
}
