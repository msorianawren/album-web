import { NextRequest } from "next/server";
import { z } from "zod";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getPublicUrl, headR2Object } from "@/lib/r2";
import { nativeVideoKeyPrefix, validateNativeVideoMetadata } from "@/lib/facebook-feed/native-video";

export const runtime = "nodejs";
const input = z.object({ r2Key: z.string().startsWith(nativeVideoKeyPrefix).endsWith(".mp4") });

export async function POST(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can complete native feed video uploads.", 403);
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return apiError("INVALID_INPUT", "Invalid native video upload.", 400);
    const object = await headR2Object(parsed.data.r2Key);
    validateNativeVideoMetadata(object.contentType, object.contentLength);
    return apiSuccess({ videoUrl: getPublicUrl(parsed.data.r2Key), videoMimeType: object.contentType, videoSizeBytes: object.contentLength });
  } catch (error) {
    return error instanceof Error && error.message.startsWith("Native video")
      ? apiError("INVALID_INPUT", error.message, 400)
      : toServerError(error, request, "facebook-feed.native-video.complete");
  }
}
