import { NextRequest } from "next/server";
import JSZip from "jszip";
import { getAlbum } from "@/lib/albums";
import { getPublicSession } from "@/lib/auth";
import { apiError, toServerError } from "@/lib/errors";
import { extensionFromUrlOrMime, safeFilename } from "@/lib/filenames";

export const runtime = "nodejs";

interface AlbumDownloadProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: AlbumDownloadProps) {
  try {
    const { id } = await params;
    const session = await getPublicSession(request);
    const album = await getAlbum(id, { isAdmin: session.isAdmin });

    if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
    if (!album.download_allowed) {
      return apiError("FORBIDDEN", "Album downloads are not available.", 403);
    }

    const images = album.media.filter((item) => item.media_type === "image");
    if (!images.length) {
      return apiError("INVALID_INPUT", "This album has no images to download.", 400);
    }

    const zip = new JSZip();
    let added = 0;

    for (const [index, image] of images.entries()) {
      const response = await fetch(image.url);
      if (!response.ok) continue;
      const data = await response.arrayBuffer();
      const extension = extensionFromUrlOrMime(image.url, image.mime_type);
      const filename = `${String(index + 1).padStart(2, "0")}-${safeFilename(
        image.title ?? image.original_filename ?? image.id,
      )}.${extension}`;
      zip.file(filename, data);
      added += 1;
    }

    if (!added) {
      return apiError("NOT_FOUND", "No source images could be downloaded.", 404);
    }

    const content = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const filename = `${safeFilename(album.title, "album")}.zip`;

    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return toServerError(error);
  }
}
