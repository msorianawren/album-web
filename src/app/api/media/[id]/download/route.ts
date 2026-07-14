import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { recordUserAlbumActivity } from "@/lib/user-activity";
import { apiError, toServerError } from "@/lib/errors";
import { extensionFromUrlOrMime, safeFilename } from "@/lib/filenames";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { createPublicServerClient } from "@/lib/db/public";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { authorizePrivateMediaAsset } from "@/lib/private-media";
import { getR2ObjectStream } from "@/lib/r2";

export const runtime = "nodejs";

const MEDIA_DOWNLOAD_SELECT = "id,album_id,media_type,title,original_filename,mime_type,download_allowed,original_download_allowed,url,thumbnail_url,medium_url,poster_url";

interface MediaDownloadProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: MediaDownloadProps) {
  try {
    const { id } = await params;
    const session = await getPublicSession(request);
    const userClient = session.userId ? await createAuthenticatedUserClient(request) : null;
    const readClient = userClient ?? createPublicServerClient();
    const settings = await getSiteSettings();
    const rate = await enforceRateLimit({
      request,
      session,
      policy: {
        action: "download_media",
        limit: settings.download_rate_limit_count,
        windowSeconds: settings.download_rate_limit_window_seconds,
      },
    });

    if (!rate.allowed) {
      return apiError("RATE_LIMITED", "Too many download requests. Please wait before trying again.", 429);
    }

    const { data: media, error } = await readClient
      .from("media")
      .select(MEDIA_DOWNLOAD_SELECT)
      .eq("id", id)
      .single();

    if (error || !media) return apiError("NOT_FOUND", "Media not found.", 404);

    const { data: album, error: albumError } = await readClient
      .from("albums")
      .select("id,title,status")
      .eq("id", media.album_id)
      .single();

    if (albumError || !album) return apiError("NOT_FOUND", "Album not found.", 404);

    const canDownload =
      session.isAdmin ||
      (album?.status === "public" && settings.allow_public_downloads && media.download_allowed !== false);
    if (!canDownload) {
      return apiError("FORBIDDEN", "Downloads are not available for this media.", 403);
    }

    const sourceUrl =
      session.isAdmin && settings.allow_original_downloads && media.original_download_allowed
        ? media.url
        : media.media_type === "image"
          ? media.medium_url ?? media.thumbnail_url ?? media.url
          : media.url;

    const privateVariant =
      session.isAdmin && settings.allow_original_downloads && media.original_download_allowed
        ? "original"
        : media.media_type === "image"
          ? "medium"
          : "display";
    let body: BodyInit | null;
    let contentLength: number | undefined;
    let contentType: string;
    let extensionSource = sourceUrl;

    if (album.status === "private") {
      const asset = await authorizePrivateMediaAsset(request, media.id, privateVariant);
      if (!asset) return apiError("NOT_FOUND", "Media not found.", 404);
      const object = await getR2ObjectStream({
        key: asset.objectKey,
        bucketRole: asset.bucketRole,
      });
      body = object.body;
      contentLength = object.contentLength;
      contentType = object.contentType ?? asset.contentType ?? media.mime_type ?? "application/octet-stream";
      extensionSource = asset.objectKey;
    } else {
      const upstream = await fetch(sourceUrl);
      if (!upstream.ok) return apiError("NOT_FOUND", "Source file not found.", 404);
      body = upstream.body;
      contentLength = Number(upstream.headers.get("content-length") ?? 0) || undefined;
      contentType =
        media.media_type === "image" && sourceUrl !== media.url
          ? "image/webp"
          : media.mime_type ?? upstream.headers.get("content-type") ?? "application/octet-stream";
    }
    const extension = extensionFromUrlOrMime(extensionSource, contentType);
    const filename = `${safeFilename(album?.title ?? "album")}-${safeFilename(
      media.title ?? media.original_filename ?? media.id,
    )}.${extension}`;

    await logAuditEvent({
      request,
      session,
      action: "download_media",
      targetType: "media",
      targetId: media.id,
      metadata: {
        albumId: album.id,
        variant: sourceUrl === media.url ? "source" : "public-processed",
      },
    });

    await recordUserAlbumActivity({
      request,
      session,
      albumId: album.id,
      mediaId: media.id,
      eventType: "album_downloaded_media",
      albumStatus: album.status,
      metadata: { variant: sourceUrl === media.url ? "source" : "public-processed" },
    });

    const headers = new Headers({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
    if (contentLength !== undefined) headers.set("Content-Length", String(contentLength));

    return new Response(body, {
      headers,
    });
  } catch (error) {
    return toServerError(error);
  }
}
