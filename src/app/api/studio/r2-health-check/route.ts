import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/errors";
import { getR2Bucket, r2 } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return apiError("FORBIDDEN", "Only the admin can check R2 health.", 403);

  try {
    const bucket = getR2Bucket();
    await r2.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    return apiSuccess({
      ok: true,
      message: "R2 connection OK. Bucket is reachable without exposing credentials.",
    });
  } catch (error) {
    return apiSuccess({
      ok: false,
      message: error instanceof Error ? error.message : "R2 check failed.",
    });
  }
}
