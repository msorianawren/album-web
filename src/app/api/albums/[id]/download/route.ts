import { NextRequest } from "next/server";
import JSZip from "jszip";
import { getAlbum } from "@/lib/albums";
import { getPublicSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { apiError, toServerError } from "@/lib/errors";
import { extensionFromUrlOrMime, safeFilename } from "@/lib/filenames";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";

export const runtime = "nodejs";
const maxZipImages = 150;
const maxZipSourceBytes = 500 * 1024 * 1024;

interface AlbumDownloadProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: AlbumDownloadProps) {
  try {
    const { id } = await params;
    const session = await getPublicSession(request);
    const settings = await getSiteSettings();
    const rate = await enforceRateLimit({
      request,
      session,
      policy: {
        action: "download_album",
        limit: settings.download_rate_limit_count,
        windowSeconds: settings.download_rate_limit_window_seconds,
      },
    });

    if (!rate.allowed) {
      return apiError("RATE_LIMITED", "Too many download requests. Please wait before trying again.", 429);
    }

    const album = await getAlbum(id, { isAdmin: session.isAdmin });

    if (!album) return apiError("NOT_FOUND", "Album not found.", 404);
    if (!settings.allow_public_downloads && !session.isAdmin) {
      return apiError("FORBIDDEN", "Album downloads are currently disabled.", 403);
    }
    if (!album.download_allowed) {
      return apiError("FORBIDDEN", "Album downloads are not available.", 403);
    }

    const images = album.media.filter(
      (item) => item.media_type === "image" && (session.isAdmin || item.download_allowed !== false),
    );
    if (!images.length) {
      return apiError("INVALID_INPUT", "This album has no images to download.", 400);
    }

    if (images.length > maxZipImages) {
      return apiError(
        "PAYLOAD_TOO_LARGE",
        `Album ZIP is limited to ${maxZipImages} images at a time. Download individual images or split the album.`,
        413,
      );
    }

    const estimatedBytes = images.reduce((sum, image) => sum + (image.file_size ?? 0), 0);
    if (estimatedBytes > maxZipSourceBytes) {
      return apiError(
        "PAYLOAD_TOO_LARGE",
        "This album is too large to package safely in one ZIP download.",
        413,
      );
    }

    const zip = new JSZip();
    let added = 0;

    for (const [index, image] of images.entries()) {
      const sourceUrl =
        session.isAdmin && settings.allow_original_downloads && image.original_download_allowed
          ? image.url
          : image.medium_url ?? image.thumbnail_url ?? image.url;
      const response = await fetch(sourceUrl);
      if (!response.ok) continue;
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length && length > maxZipSourceBytes) continue;
      const data = await response.arrayBuffer();
      if (data.byteLength > maxZipSourceBytes) continue;
      const extension = extensionFromUrlOrMime(sourceUrl, "image/webp");
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
    await logAuditEvent({
      request,
      session,
      action: "download_album_zip",
      targetType: "album",
      targetId: album.id,
      metadata: {
        added,
        originalDownloadsAllowed: settings.allow_original_downloads,
      },
    });

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
