import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { putR2Object } from "@/lib/r2";
import { validateUploadFile } from "@/lib/upload-validation";

export const runtime = "nodejs";

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

    const source = Buffer.from(await file.arrayBuffer());
    const validation = validateUploadFile({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      buffer: source,
      options: {
        enableVideoUploads: false,
        maxImageSizeBytes: 30 * 1024 * 1024,
      },
    });

    if (!validation.ok || validation.value.mediaType !== "image") {
      return apiError(
        validation.ok ? "UNSUPPORTED_MEDIA_TYPE" : validation.code,
        validation.ok ? "Only image uploads are supported for landing assets." : validation.message,
        validation.ok ? 415 : validation.status,
      );
    }

    const image = sharp(source, { failOn: "none" }).rotate();
    const metadata = await image.metadata();
    const assetKey = `landing/${slot}/${randomUUID()}/asset.webp`;

    const asset = await image
      .clone()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();

    const url = await putR2Object({
      key: assetKey,
      body: asset,
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    });

    return apiSuccess(
      {
        asset: {
          url,
          previewUrl: url,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
          metadataStripped: true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return toServerError(error);
  }
}
