import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getR2Object, putR2Object, deleteR2Objects } from "@/lib/r2";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can upload landing assets.", 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { slot, r2Key } = body;

    if (!slot || !r2Key) {
      return apiError("INVALID_INPUT", "slot and r2Key are required.", 400);
    }

    const cleanSlot = String(slot).replace(/[^a-z0-9-]/gi, "-");

    // 1. Fetch original file from R2
    const source = await getR2Object(r2Key);

    // 2. Process with Sharp
    const image = sharp(source, { failOn: "none" }).rotate();
    const metadata = await image.metadata();
    const assetKey = `landing/${cleanSlot}/${randomUUID()}/asset.webp`;

    const asset = await image
      .clone()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();

    // 3. Put optimized asset to R2
    const url = await putR2Object({
      key: assetKey,
      body: asset,
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    });

    // 4. Delete temporary original upload key
    await deleteR2Objects([r2Key]);

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
