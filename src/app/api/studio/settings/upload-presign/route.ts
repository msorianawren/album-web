import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getPresignedPutUrl, getPublicUrl } from "@/lib/r2";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

function extensionFromMime(mimeType: string) {
  const fallback = mimeType.split("/").at(1) ?? "bin";
  return fallback.replace("jpeg", "jpg").replace("svg+xml", "svg");
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can upload site assets.", 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { filename, size, mimeType, type } = body;

    if (!filename || !size || !mimeType || !type) {
      return apiError("INVALID_INPUT", "filename, size, mimeType, and type are required.", 400);
    }

    const allowedTypes = ["logo", "favicon", "about-profile", "about-cover"];
    if (!allowedTypes.includes(type)) {
      return apiError("INVALID_INPUT", "Invalid asset type.", 400);
    }

    if (!mimeType.startsWith("image/")) {
      return apiError("UNSUPPORTED_MEDIA_TYPE", "Only images are allowed.", 400);
    }

    const allowedMimes = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
    if (!allowedMimes.includes(mimeType)) {
      return apiError("UNSUPPORTED_MEDIA_TYPE", "Unsupported image format.", 400);
    }

    // Max 5MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (size > maxSizeBytes) {
      return apiError("PAYLOAD_TOO_LARGE", `${filename} exceeds the maximum upload limit of 5 MB.`, 413);
    }

    const assetId = randomUUID();
    const ext = extensionFromMime(mimeType);
    const r2Key = `site/${type}/${assetId}.${ext}`;

    const uploadUrl = await getPresignedPutUrl({
      key: r2Key,
      contentType: mimeType,
      expiresIn: 300,
    });

    const publicUrl = getPublicUrl(r2Key);

    return apiSuccess({
      uploadUrl,
      r2Key,
      publicUrl,
      expiresIn: 300,
    });
  } catch (error) {
    return toServerError(error);
  }
}
