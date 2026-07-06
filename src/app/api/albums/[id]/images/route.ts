import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { uploadMediaFile } from "@/lib/media";
import { supabase } from "@/lib/supabase";
import { getMediaTypeFromMime, getUploadLimit } from "@/lib/config";
import { normalizeMedia } from "@/lib/albums";

export const runtime = "nodejs";

interface ImagesRouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: ImagesRouteProps) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .eq("album_id", id)
    .order("sort_order", { ascending: true });

  if (error) return apiError("SERVER_ERROR", error.message, 500);
  return apiSuccess({ media: (data ?? []).map((row) => normalizeMedia(row)) });
}

export async function POST(request: NextRequest, { params }: ImagesRouteProps) {
  const session = await requireAdmin(request);
  if (!session) {
    return apiError("FORBIDDEN", "Only the admin can upload media.", 403);
  }

  try {
    const { id: albumId } = await params;
    const formData = await request.formData();
    const files = formData
      .getAll("file")
      .concat(formData.getAll("files"))
      .filter((value): value is File => value instanceof File);

    if (!files.length) return apiError("INVALID_INPUT", "file is required.", 400);

    const media = [];
    for (const file of files) {
      const mediaType = getMediaTypeFromMime(file.type);
      if (!mediaType) return apiError("INVALID_INPUT", "Unsupported media type.", 400);
      if (file.size > getUploadLimit(mediaType)) {
        return apiError("INVALID_INPUT", "File exceeds upload limit.", 400);
      }

      media.push(
        await uploadMediaFile({
          albumId,
          fileName: file.name,
          mimeType: file.type,
          buffer: Buffer.from(await file.arrayBuffer()),
        }),
      );
    }

    return apiSuccess({ media }, { status: 201 });
  } catch (error) {
    return toServerError(error);
  }
}
