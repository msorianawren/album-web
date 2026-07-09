import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getPresignedPutUrl, getPublicUrl } from "@/lib/r2";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

function extensionFromMime(mimeType: string) {
  const fallback = mimeType.split("/").at(1) ?? "bin";
  return fallback.replace("jpeg", "jpg");
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can upload landing assets.", 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { slot, filename, mimeType, size } = body;

    if (!slot || !filename || !mimeType || !size) {
      return apiError("INVALID_INPUT", "slot, filename, mimeType, and size are required.", 400);
    }

    const cleanSlot = String(slot).replace(/[^a-z0-9-]/gi, "-");

    // Validate type (images only)
    if (!mimeType.startsWith("image/")) {
      return apiError("UNSUPPORTED_MEDIA_TYPE", "Only images are supported for landing assets.", 415);
    }

    // Limit landing assets to 30MB
    const maxSizeBytes = 30 * 1024 * 1024;
    if (size > maxSizeBytes) {
      return apiError("PAYLOAD_TOO_LARGE", "Landing asset exceeds the maximum 30 MB limit.", 413);
    }

    const ext = extensionFromMime(mimeType);
    const originalKey = `landing/${cleanSlot}/${randomUUID()}/original.${ext}`;

    const uploadUrl = await getPresignedPutUrl({
      key: originalKey,
      contentType: mimeType,
      expiresIn: 300,
    });

    const publicUrl = getPublicUrl(originalKey);

    return apiSuccess({
      uploadUrl,
      r2Key: originalKey,
      publicUrl,
    });
  } catch (error) {
    return toServerError(error);
  }
}
