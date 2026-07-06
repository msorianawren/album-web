import { NextRequest } from "next/server";
import { getMediaTypeFromMime, getUploadLimit } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { uploadMediaFile } from "@/lib/media";

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

    for (const file of files) {
      const mediaType = getMediaTypeFromMime(file.type);

      if (!mediaType) {
        return apiError("INVALID_INPUT", `Unsupported file type: ${file.type}`, 400);
      }

      if (file.size > getUploadLimit(mediaType)) {
        return apiError(
          "INVALID_INPUT",
          `${file.name} exceeds the ${mediaType} upload limit.`,
          400,
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      uploaded.push(
        await uploadMediaFile({
          albumId,
          fileName: file.name,
          mimeType: file.type,
          buffer,
        }),
      );
    }

    return apiSuccess({ media: uploaded }, { status: 201 });
  } catch (error) {
    return toServerError(error);
  }
}
