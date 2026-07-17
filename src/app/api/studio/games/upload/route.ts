import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getSiteSettings } from "@/lib/site-settings";
import { validateUploadFile } from "@/lib/upload-validation";
import { validateAndProcessImage } from "@/lib/media/image-processing-core";
import { deleteR2Objects, getPublicUrl, putR2Object } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only Studio administrators can upload puzzle images.", 403);
  const keys: string[] = [];
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return apiError("INVALID_INPUT", "A puzzle image is required.", 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    const settings = await getSiteSettings(database.client);
    const validation = validateUploadFile({ fileName: file.name, mimeType: file.type, size: file.size, buffer, options: { enableImageUploads: settings.enable_image_uploads, maxImageSizeBytes: settings.max_image_size_mb * 1024 * 1024 } });
    if (!validation.ok || validation.value.mediaType !== "image") return apiError(validation.ok ? "UNSUPPORTED_MEDIA_TYPE" : validation.code, validation.ok ? "Only images are allowed." : validation.message, validation.ok ? 415 : validation.status);
    const processed = await validateAndProcessImage(buffer, file.type, settings);
    const medium = processed.variants.find((variant) => variant.name === "medium")!;
    const display = await sharp(medium.webp).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    const thumbnail = processed.variants.find((variant) => variant.name === "thumbnail")!.webp;
    const assetId = randomUUID();
    const displayKey = `games/${assetId}/display.webp`;
    const previewKey = `games/${assetId}/preview.webp`;
    keys.push(displayKey, previewKey);
    await Promise.all([
      putR2Object({ key: displayKey, body: display, contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" }),
      putR2Object({ key: previewKey, body: thumbnail, contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" }),
    ]);
    return apiSuccess({ puzzleAssetKey: displayKey, previewAssetKey: previewKey, imageUrl: getPublicUrl(displayKey), previewUrl: getPublicUrl(previewKey), width: processed.width, height: processed.height });
  } catch (error) {
    if (keys.length) await deleteR2Objects(keys).catch(() => {});
    return toServerError(error, request, "api.studio.games.upload");
  }
}
