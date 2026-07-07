import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { uploadMediaFile } from "@/lib/media";
import { validateUploadFile } from "@/lib/upload-validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can upload media.", 403);
  }

  try {
    const formData = await request.formData();
    const albumId = String(formData.get("albumId") ?? "");
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (!albumId || !files.length) {
      return apiError("INVALID_INPUT", "albumId and files[] are required.", 400);
    }

    const uploaded = [];
    const failed = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const validation = validateUploadFile({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        buffer,
      });

      if (!validation.ok) {
        failed.push({
          fileName: file.name,
          code: validation.code,
          message: validation.message,
        });
        continue;
      }

      try {
        uploaded.push(
          await uploadMediaFile({
            albumId,
            fileName: validation.value.safeName,
            mimeType: file.type,
            buffer,
          }),
        );
      } catch (error) {
        failed.push({
          fileName: file.name,
          code: "UPLOAD_FAILED",
          message: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }

    if (!uploaded.length && failed.length) {
      const first = failed[0];
      return apiError(
        first.code === "PAYLOAD_TOO_LARGE" ? "PAYLOAD_TOO_LARGE" : first.code === "UNSUPPORTED_MEDIA_TYPE" ? "UNSUPPORTED_MEDIA_TYPE" : "UPLOAD_FAILED",
        first.message,
        first.code === "PAYLOAD_TOO_LARGE" ? 413 : first.code === "UNSUPPORTED_MEDIA_TYPE" ? 415 : 500,
        { failed },
      );
    }

    return apiSuccess({ media: uploaded, failed }, { status: failed.length ? 207 : 201 });
  } catch (error) {
    return toServerError(error);
  }
}
