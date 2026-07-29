import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getPresignedPutUrl, getPublicUrl } from "@/lib/r2";
import { maxNativeVideoBytes, nativeVideoKeyPrefix } from "@/lib/facebook-feed/native-video";

export const runtime = "nodejs";
const input = z.object({ filename: z.string().trim().min(1).max(255), mimeType: z.literal("video/mp4"), size: z.number().int().positive().max(maxNativeVideoBytes) });

export async function POST(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can upload native feed videos.", 403);
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return apiError("INVALID_INPUT", "Upload an MP4 video no larger than 500 MB.", 400);
    const r2Key = `${nativeVideoKeyPrefix}${randomUUID()}/asset.mp4`;
    const uploadUrl = await getPresignedPutUrl({ key: r2Key, contentType: parsed.data.mimeType, expiresIn: 300 });
    return apiSuccess({ uploadUrl, r2Key, publicUrl: getPublicUrl(r2Key), expiresIn: 300 });
  } catch (error) { return toServerError(error, request, "facebook-feed.native-video.presign"); }
}
