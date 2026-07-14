import { NextRequest } from "next/server";
import JSZip from "jszip";
import sharp from "sharp";
import { getAlbum } from "@/lib/albums";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { logAuditEvent } from "@/lib/audit";
import { recordUserAlbumActivity } from "@/lib/user-activity";
import { apiError, toServerError } from "@/lib/errors";
import { extensionFromUrlOrMime, safeFilename, sanitizeZipPathSegment } from "@/lib/filenames";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { authorizePrivateMediaAsset, readAuthorizedPrivateMedia } from "@/lib/private-media";

export const runtime = "nodejs";
const maxZipImages = 100;
const maxZipSourceBytes = 150 * 1024 * 1024;

interface AlbumDownloadProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: AlbumDownloadProps) {
  try {
    const { id } = await params;
    const session = await getPublicSession(request);
    const userClient = session.userId ? await createAuthenticatedUserClient(request) : null;
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

    const album = await getAlbum(id, { isAdmin: session.isAdmin, userClient });

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
    
    const folderName = sanitizeZipPathSegment(`Oriana-Wren-${album.title || album.slug}`, "album-export");
    const topFolder = zip.folder(folderName);
    
    if (!topFolder) {
      return apiError("SERVER_ERROR", "Failed to initialize ZIP folder structure.", 500);
    }

    let added = 0;

    for (const [index, image] of images.entries()) {
      const canDownloadOriginal = session.isAdmin || (settings.allow_original_downloads && image.original_download_allowed);
      let sourceUrl = image.medium_url ?? image.thumbnail_url;
      const privateVariant = canDownloadOriginal ? "original" : "medium";

      if (canDownloadOriginal) {
        sourceUrl = image.url;
      } else if (!sourceUrl) {
        if (image.metadata_stripped) {
          sourceUrl = image.url;
        } else {
          continue;
        }
      }

      let fileData: ArrayBuffer | Buffer;
      let sourceForExtension = sourceUrl ?? image.id;
      let sourceMime = "image/webp";
      if (album.status === "private") {
        const asset = await authorizePrivateMediaAsset(request, image.id, privateVariant);
        if (!asset) continue;
        fileData = await readAuthorizedPrivateMedia(asset);
        sourceForExtension = asset.objectKey;
        sourceMime = asset.contentType ?? image.mime_type ?? sourceMime;
      } else {
        const response = await fetch(sourceUrl!);
        if (!response.ok) continue;
        const length = Number(response.headers.get("content-length") ?? 0);
        if (length && length > maxZipSourceBytes) continue;
        fileData = await response.arrayBuffer();
        sourceMime = response.headers.get("content-type") ?? sourceMime;
      }
      if (fileData.byteLength > maxZipSourceBytes) continue;
      
      let extension = extensionFromUrlOrMime(sourceForExtension, sourceMime);
      const baseName = `${String(index + 1).padStart(2, "0")}-${safeFilename(image.title ?? image.original_filename ?? image.id)}`;
      let finalFilename = `${baseName}.${extension}`;

      // Convert to JPG using sharp if it's an image and not a GIF
      if (extension.toLowerCase() !== "gif") {
        try {
          fileData = await sharp(fileData)
            .jpeg({ quality: 90, progressive: true })
            .toBuffer();
          extension = "jpg";
          finalFilename = `${baseName}.jpg`;
        } catch (err) {
          console.warn(`[ZIP Export] Failed to convert image ${image.id} to JPG, falling back to ${extension}.`, err);
        }
      }

      topFolder.file(finalFilename, fileData);
      added += 1;
    }

    // Add optional manifest
    topFolder.file("README.txt", `Album: ${album.title || album.slug}\nExported from: orianawren.com\nDate: ${new Date().toISOString()}\nFiles: ${added}\n\nNote: These files are provided for permitted personal/private use according to album permissions.`);

    if (!added) {
      return apiError("NOT_FOUND", "No source images could be downloaded.", 404);
    }

    const nodeStream = zip.generateNodeStream({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const stream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        nodeStream.on("end", () => {
          controller.close();
        });
        nodeStream.on("error", (err) => {
          controller.error(err);
        });
      },
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

    await recordUserAlbumActivity({
      request,
      session,
      albumId: album.id,
      eventType: "album_downloaded_zip",
      albumStatus: album.status,
      metadata: { added },
    });

    return new Response(stream, {
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
