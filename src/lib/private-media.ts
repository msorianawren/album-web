import "server-only";
import type { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { createTrustedPrivateMediaDeliveryClient } from "@/lib/db/private-media-delivery";
import type { AlbumPreviewItem, Media } from "@/lib/types";
import type { R2BucketRole } from "@/lib/r2";

export const PRIVATE_MEDIA_SAFE_SELECT = [
  "id",
  "album_id",
  "owner_id",
  "media_type",
  "title",
  "description",
  "width",
  "height",
  "duration_seconds",
  "file_size",
  "mime_type",
  "original_filename",
  "safe_display_name",
  "uploaded_at",
  "taken_at",
  "sort_date",
  "aspect_ratio",
  "orientation",
  "file_extension",
  "original_file_size",
  "original_mime_type",
  "featured_rank",
  "view_count",
  "metadata_status",
  "processing_status",
  "security_status",
  "security_notes",
  "download_allowed",
  "original_download_allowed",
  "metadata_stripped",
  "deleted_at",
  "deleted_by",
  "delete_reason",
  "sort_order",
  "is_cover",
  "created_at",
  "updated_at",
].join(",");

export type PrivateMediaVariant = "thumbnail" | "medium" | "poster" | "display" | "original";

export interface AuthorizedPrivateMediaAsset {
  mediaId: string;
  albumId: string;
  mediaType: "image" | "video";
  objectKey: string;
  bucketRole: R2BucketRole;
  contentType: string | null;
}

function privateMediaUrl(mediaId: string, variant: Exclude<PrivateMediaVariant, "original">) {
  return `/api/media/${encodeURIComponent(mediaId)}/content?variant=${variant}`;
}

export function projectPrivateMediaForClient(media: Media): Media {
  const displayUrl = privateMediaUrl(media.id, "display");
  return {
    ...media,
    r2_key: "",
    public_r2_key: null,
    original_private_r2_key: null,
    url: displayUrl,
    thumbnail_url: privateMediaUrl(media.id, "thumbnail"),
    medium_url: privateMediaUrl(media.id, "medium"),
    poster_url: media.media_type === "video" ? privateMediaUrl(media.id, "poster") : null,
  };
}

export function projectPrivatePreviewForClient({
  id,
  mediaType,
  title,
}: {
  id: string;
  mediaType: "image" | "video";
  title: string | null;
}): AlbumPreviewItem {
  return {
    id,
    media_type: mediaType,
    title,
    url: privateMediaUrl(id, "display"),
    thumbnail_url: privateMediaUrl(id, "thumbnail"),
    medium_url: privateMediaUrl(id, "medium"),
    poster_url: mediaType === "video" ? privateMediaUrl(id, "poster") : null,
  };
}

function isSafeObjectKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 1024 &&
    !value.startsWith("/") &&
    !value.includes("..") &&
    !/^https?:\/\//i.test(value)
  );
}

function variantFallbacks(variant: PrivateMediaVariant, mediaType: "image" | "video") {
  if (variant === "original") return ["original", "display"];
  if (variant === "thumbnail") return ["thumbnail", "poster", "medium", "display"];
  if (variant === "poster") return ["poster", "thumbnail", "display"];
  if (variant === "medium") return ["medium", "display", "thumbnail"];
  return mediaType === "video"
    ? ["display", "original"]
    : ["display", "medium", "thumbnail", "original"];
}

function legacyAssetForVariant(
  row: Record<string, unknown>,
  variant: PrivateMediaVariant,
  mediaType: "image" | "video",
) {
  const candidates: Record<PrivateMediaVariant, unknown[]> = {
    thumbnail: [row.thumbnail_r2_key, row.poster_r2_key, row.medium_r2_key, row.public_r2_key, row.r2_key],
    medium: [row.medium_r2_key, row.public_r2_key, row.thumbnail_r2_key, row.r2_key],
    poster: [row.poster_r2_key, row.thumbnail_r2_key, row.r2_key],
    display: mediaType === "video"
      ? [row.r2_key, row.public_r2_key]
      : [row.medium_r2_key, row.public_r2_key, row.thumbnail_r2_key, row.r2_key],
    original: [row.original_private_r2_key, row.r2_key],
  };
  return candidates[variant].find(isSafeObjectKey) ?? null;
}

async function getPrivateAssetRecord(
  mediaId: string,
  variant: PrivateMediaVariant,
  mediaType: "image" | "video",
) {
  const trusted = createTrustedPrivateMediaDeliveryClient();
  const fallbacks = variantFallbacks(variant, mediaType);
  const manifest = await trusted
    .from("private_media_assets")
    .select("variant,object_key,bucket_role,mime_type")
    .eq("media_id", mediaId)
    .in("variant", fallbacks);

  if (!manifest.error) {
    const rows = manifest.data ?? [];
    const asset = fallbacks
      .map((candidate) => rows.find((row) => row.variant === candidate))
      .find((row) => row && isSafeObjectKey(row.object_key));
    if (asset) {
      return {
        objectKey: asset.object_key as string,
        bucketRole: asset.bucket_role === "private" ? "private" as const : "public" as const,
        contentType: typeof asset.mime_type === "string" ? asset.mime_type : null,
      };
    }
  } else if (!["42P01", "PGRST205"].includes(manifest.error.code)) {
    throw manifest.error;
  }

  // Compatibility path until the additive manifest migration is applied.
  const legacy = await trusted
    .from("media")
    .select("r2_key,thumbnail_r2_key,medium_r2_key,poster_r2_key,public_r2_key,original_private_r2_key,mime_type")
    .eq("id", mediaId)
    .single();
  if (legacy.error || !legacy.data) return null;
  const objectKey = legacyAssetForVariant(legacy.data, variant, mediaType);
  if (!objectKey) return null;
  return {
    objectKey,
    bucketRole: "public" as const,
    contentType:
      variant !== "original" && (mediaType === "image" || variant === "thumbnail" || variant === "poster")
        ? "image/webp"
        : typeof legacy.data.mime_type === "string"
          ? legacy.data.mime_type
          : null,
  };
}

export async function authorizePrivateMediaAsset(
  request: NextRequest,
  mediaId: string,
  variant: PrivateMediaVariant,
): Promise<AuthorizedPrivateMediaAsset | null> {
  const session = await getPublicSession(request);
  if (!session.userId || session.isBlocked) return null;

  const userClient = await createAuthenticatedUserClient(request);
  if (!userClient) return null;
  const { data: media, error: mediaError } = await userClient
    .from("media")
    .select(`id,album_id,media_type,mime_type,albums!inner(status)`)
    .eq("id", mediaId)
    .is("deleted_at", null)
    .maybeSingle();
  if (mediaError || !media) return null;

  const albumRelation = Array.isArray(media.albums) ? media.albums[0] : media.albums;
  if (!albumRelation || albumRelation.status !== "private") return null;

  const mediaType = media.media_type === "video" ? "video" : "image";
  const asset = await getPrivateAssetRecord(media.id, variant, mediaType);
  if (!asset) return null;

  return {
    mediaId: media.id,
    albumId: media.album_id,
    mediaType,
    objectKey: asset.objectKey,
    bucketRole: asset.bucketRole,
    contentType: asset.contentType ?? (typeof media.mime_type === "string" ? media.mime_type : null),
  };
}
