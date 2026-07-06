import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getR2Bucket, r2 } from "@/lib/r2";
import { supportedImageTypes } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const albumId = String(body.albumId ?? "");
  const contentType = String(body.contentType ?? "");

  if (!albumId) {
    return NextResponse.json({ error: "albumId is required" }, { status: 400 });
  }

  if (!supportedImageTypes.includes(contentType as (typeof supportedImageTypes)[number])) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  }

  const extension = contentType.split("/").at(1)?.replace("jpeg", "jpg") ?? "jpg";
  const key = `albums/${albumId}/original/${randomUUID()}.${extension}`;
  const signedUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 },
  );

  return NextResponse.json({ key, signedUrl, expiresIn: 3600 });
}
