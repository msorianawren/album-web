import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest } from "next/server";
import { getMediaTypeFromMime } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/errors";
import { getR2Bucket, r2 } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can request upload URLs.", 403);
  }

  const body = await request.json();
  const albumId = String(body.albumId ?? "");
  const contentType = String(body.contentType ?? "");
  const mediaType = getMediaTypeFromMime(contentType);

  if (!albumId) return apiError("INVALID_INPUT", "albumId is required.", 400);
  if (!mediaType) return apiError("INVALID_INPUT", "Unsupported media type.", 400);

  const extension =
    contentType.split("/").at(1)?.replace("jpeg", "jpg").replace("quicktime", "mov") ??
    "bin";
  const folder = mediaType === "image" ? "images" : "videos";
  const key = `albums/${albumId}/${folder}/${randomUUID()}/original.${extension}`;
  const signedUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 },
  );

  return apiSuccess({ key, signedUrl, expiresIn: 3600 });
}
