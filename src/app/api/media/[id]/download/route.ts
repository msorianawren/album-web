import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { apiError, toServerError } from "@/lib/errors";
import { extensionFromUrlOrMime, safeFilename } from "@/lib/filenames";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

interface MediaDownloadProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: MediaDownloadProps) {
  try {
    const { id } = await params;
    const session = await getPublicSession(request);
    const { data: media, error } = await supabase
      .from("media")
      .select("id,album_id,title,original_filename,url,mime_type,media_type")
      .eq("id", id)
      .single();

    if (error || !media) return apiError("NOT_FOUND", "Media not found.", 404);

    const { data: album, error: albumError } = await supabase
      .from("albums")
      .select("id,title,status")
      .eq("id", media.album_id)
      .single();

    if (albumError || !album) return apiError("NOT_FOUND", "Album not found.", 404);

    const canDownload = session.isAdmin || album?.status === "public";
    if (!canDownload) {
      return apiError("FORBIDDEN", "Downloads are not available for this media.", 403);
    }

    const upstream = await fetch(media.url);
    if (!upstream.ok) return apiError("NOT_FOUND", "Source file not found.", 404);

    const extension = extensionFromUrlOrMime(media.url, media.mime_type);
    const filename = `${safeFilename(album?.title ?? "album")}-${safeFilename(
      media.title ?? media.original_filename ?? media.id,
    )}.${extension}`;

    return new Response(upstream.body, {
      headers: {
        "Content-Type": media.mime_type ?? upstream.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return toServerError(error);
  }
}
