import { NextRequest } from "next/server";
import JSZip from "jszip";
import sharp from "sharp";
import { getAlbum } from "@/lib/albums";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { logAuditEvent } from "@/lib/audit";
import { recordUserAlbumActivity, recordGuestAlbumActivity } from "@/lib/user-activity";
import { apiError, toServerError } from "@/lib/errors";
import { extensionFromUrlOrMime, safeFilename, sanitizeZipPathSegment } from "@/lib/filenames";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { authorizePrivateMediaAsset, readAuthorizedPrivateMedia } from "@/lib/private-media";
import {
  getMediaDeliveryDescriptor,
  isExpectedMediaContentType,
} from "@/lib/media/delivery";
import { getOrCreateGuestVisitor, isGuestTrackingEnabled, setGuestCookie } from "@/lib/guest-visitor";


export const runtime = "nodejs";
const maxZipImages = 100;
const maxZipSourceBytes = 150 * 1024 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    const requestedMedia = request.nextUrl.searchParams.get("media");
    const requestedIds = requestedMedia
      ? requestedMedia.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
    if (
      requestedIds.length > maxZipImages ||
      requestedIds.some((value) => !uuidPattern.test(value))
    ) {
      return apiError("INVALID_INPUT", "Selected media IDs are invalid or exceed the ZIP limit.", 400);
    }
    const selectedIds = requestedIds.length ? new Set(requestedIds) : null;

    const images = album.media.filter(
      (item) => item.media_type === "image" && (session.isAdmin || item.download_allowed !== false),
    ).filter((item) => !selectedIds || selectedIds.has(item.id));
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
      const privateVariant = canDownloadOriginal ? "original" : "medium";
      const delivery = getMediaDeliveryDescriptor(image, {
        albumStatus: album.status,
        isAuthorized: true,
        downloadAllowed: true,
        originalDownloadAllowed: canDownloadOriginal,
      });
      const sourceTarget = canDownloadOriginal ? delivery.originalDownload : delivery.download;
      const sourceUrl = sourceTarget.src;
      if (!sourceUrl && album.status !== "private") continue;

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
        let selectedResponse: Response | null = null;
        let selectedSource = sourceUrl!;
        for (const candidate of sourceTarget.candidates) {
          const response = await fetch(candidate.src);
          const contentType = response.headers.get("content-type");
          const length = Number(response.headers.get("content-length") ?? 0);
          if (
            response.ok &&
            (!length || length <= maxZipSourceBytes) &&
            isExpectedMediaContentType(contentType, candidate.expectedContentType)
          ) {
            selectedResponse = response;
            selectedSource = candidate.src;
            break;
          }
          await response.body?.cancel();
        }
        if (!selectedResponse) continue;
        fileData = await selectedResponse.arrayBuffer();
        sourceMime = selectedResponse.headers.get("content-type")!.split(";", 1)[0];
        sourceForExtension = selectedSource;
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

    // — Authenticated user tracking —
    if (session.userId) {
      await Promise.all([
        logAuditEvent({
          request, session,
          action: "download_album_zip",
          targetType: "album", targetId: album.id,
          metadata: { added, originalDownloadsAllowed: settings.allow_original_downloads, album_name: album.title },
        }),
        recordUserAlbumActivity({
          request, session, albumId: album.id,
          eventType: "album_downloaded_zip", albumStatus: album.status,
          metadata: { added },
        }),
      ]);
    } else {
      // — Guest tracking —
      const advanced = settings.advanced_settings as Record<string, unknown> | undefined;
      if (isGuestTrackingEnabled(advanced)) {
        const guest = await getOrCreateGuestVisitor(request);
        if (guest) {
          void Promise.all([
            logAuditEvent({
              request, session,
              action: "download_album_zip",
              targetType: "album", targetId: album.id,
              guestVisitorId: guest.id,
              metadata: { added, album_name: album.title, guest_name: guest.visitor_name },
            }),
            recordGuestAlbumActivity({
              guestVisitorId: guest.id, albumId: album.id,
              eventType: "album_downloaded_zip", albumStatus: album.status,
              metadata: { added }, advancedSettings: advanced,
            }),
          ]);

          // Build response with cookie if needed
          const hasGidCookie = request.cookies.get("gid");
          const response = new Response(stream, {
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Cache-Control": "private, no-store",
            },
          });
          if (!hasGidCookie) {
            // Manually set cookie header (Response doesn't have .cookies API)
            response.headers.append(
              "Set-Cookie",
              `gid=${guest.id}; HttpOnly; SameSite=Lax; Max-Age=${365 * 24 * 60 * 60}; Path=/${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
            );
          }
          return response;
        }
      }
    }

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
