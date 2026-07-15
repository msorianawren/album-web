import "server-only";
import type { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { createTrustedPrivateMediaDeliveryClient } from "@/lib/db/private-media-delivery";
import type { AlbumPreviewItem, Media } from "@/lib/types";
import {
  getR2Object,
  getR2ObjectStream,
  tryHeadR2Object,
  type R2BucketRole,
} from "@/lib/r2";
import {
  isSafePrivateMediaObjectKey,
  selectPrivateMediaManifestSource,
} from "@/lib/private-media-delivery-policy";

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
  fallbackObjectKey: string | null;
  deliverySource: "private_manifest" | "legacy_gateway_fallback";
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

function variantFallbacks(variant: PrivateMediaVariant, mediaType: "image" | "video") {
  if (variant === "original") return ["original"];
  if (variant === "thumbnail") return ["thumbnail", "medium", "display"];
  if (variant === "poster") return ["poster", "thumbnail", "display"];
  if (variant === "medium") return ["medium", "display", "thumbnail"];
  return mediaType === "video"
    ? ["video", "display"]
    : ["display", "large", "medium", "thumbnail"];
}

function keyFromPublicUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const rawValue = value;
  const bareObjectKey =
    rawValue.length <= 1024 &&
    !rawValue.startsWith("/") &&
    !rawValue.includes("..") &&
    !/^https?:\/\//i.test(rawValue);
  if (bareObjectKey) return rawValue;
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!publicBase || !rawValue.startsWith(`${publicBase}/`)) return null;
  try {
    const key = decodeURIComponent(new URL(rawValue).pathname.replace(/^\/+/, ""));
    return isSafePrivateMediaObjectKey(key) ? key : null;
  } catch {
    return null;
  }
}

function legacyAssetForVariant(
  row: Record<string, unknown>,
  variant: PrivateMediaVariant,
  mediaType: "image" | "video",
) {
  const candidates: Record<PrivateMediaVariant, unknown[]> = {
    thumbnail: [
      row.thumbnail_r2_key,
      row.poster_r2_key,
      row.medium_r2_key,
      row.public_r2_key,
      keyFromPublicUrl(row.thumbnail_url),
      keyFromPublicUrl(row.medium_url),
      row.r2_key,
    ],
    medium: [
      row.medium_r2_key,
      row.public_r2_key,
      keyFromPublicUrl(row.medium_url),
      row.thumbnail_r2_key,
      keyFromPublicUrl(row.thumbnail_url),
      row.r2_key,
    ],
    poster: [row.poster_r2_key, keyFromPublicUrl(row.poster_url), row.thumbnail_r2_key, row.r2_key],
    display: mediaType === "video"
      ? [row.r2_key, row.public_r2_key, keyFromPublicUrl(row.url)]
      : [
          row.medium_r2_key,
          row.public_r2_key,
          keyFromPublicUrl(row.medium_url),
          keyFromPublicUrl(row.url),
          row.thumbnail_r2_key,
          keyFromPublicUrl(row.thumbnail_url),
          row.r2_key,
        ],
    original: [row.original_private_r2_key, row.r2_key],
  };
  return candidates[variant].find((candidate): candidate is string => isSafePrivateMediaObjectKey(candidate)) ?? null;
}

async function verifiedObject(
  objectKey: string | null,
  bucketRole: R2BucketRole,
) {
  if (!objectKey) return false;
  const head = await tryHeadR2Object(objectKey, bucketRole);
  return head.exists;
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
    .select("variant,object_key,legacy_object_key,bucket_role,mime_type,migration_state")
    .eq("media_id", mediaId)
    .in("variant", fallbacks);

  if (!manifest.error) {
    const manifestRows = manifest.data ?? [];
    for (const fallback of fallbacks) {
      const active = manifestRows.find(
        (row) =>
          row.variant === fallback &&
          row.bucket_role === "private" &&
          row.migration_state === "active" &&
          isSafePrivateMediaObjectKey(row.object_key),
      );
      if (active && await verifiedObject(active.object_key, "private")) {
        return {
          objectKey: active.object_key,
          bucketRole: "private" as const,
          fallbackObjectKey: isSafePrivateMediaObjectKey(active.legacy_object_key)
            ? active.legacy_object_key
            : null,
          contentType: active.mime_type ?? null,
          deliverySource: "private_manifest" as const,
        };
      }

      if (
        active &&
        isSafePrivateMediaObjectKey(active.legacy_object_key) &&
        await verifiedObject(active.legacy_object_key, "public")
      ) {
        return {
          objectKey: active.legacy_object_key,
          bucketRole: "public" as const,
          fallbackObjectKey: null,
          contentType: active.mime_type ?? null,
          deliverySource: "legacy_gateway_fallback" as const,
        };
      }
    }

    const asset = selectPrivateMediaManifestSource(manifestRows, fallbacks);
    if (asset?.bucketRole === "public" && await verifiedObject(asset.objectKey, "public")) {
      return {
        ...asset,
        deliverySource: "legacy_gateway_fallback" as const,
      };
    }
  } else if (!["42P01", "PGRST205"].includes(manifest.error.code)) {
    throw manifest.error;
  }

  // Compatibility path until manifest coverage and private-object cutover are complete.
  const legacy = await trusted
    .from("media")
    .select("r2_key,thumbnail_r2_key,medium_r2_key,poster_r2_key,public_r2_key,original_private_r2_key,thumbnail_url,medium_url,poster_url,url,mime_type")
    .eq("id", mediaId)
    .single();
  if (legacy.error || !legacy.data) return null;
  const objectKey = legacyAssetForVariant(legacy.data, variant, mediaType);
  if (!objectKey || !(await verifiedObject(objectKey, "public"))) return null;
  return {
    objectKey,
    bucketRole: "public" as const,
    fallbackObjectKey: null,
    deliverySource: "legacy_gateway_fallback" as const,
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
  const trusted = createTrustedPrivateMediaDeliveryClient();
  const { data: media, error: mediaError } = await trusted
    .from("media")
    .select("id,album_id,media_type,mime_type,albums!media_album_id_fkey!inner(status)")
    .eq("id", mediaId)
    .is("deleted_at", null)
    .maybeSingle();
  if (mediaError || !media) return null;

  const albumRelation = Array.isArray(media.albums) ? media.albums[0] : media.albums;
  if (!albumRelation || albumRelation.status !== "private") return null;

  const { data: canAccess, error: accessError } = await userClient.rpc(
    "can_access_private_album",
    { target_album_id: media.album_id },
  );
  if (accessError || canAccess !== true) return null;

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
    fallbackObjectKey: asset.fallbackObjectKey,
    deliverySource: asset.deliverySource,
  };
}

export async function streamAuthorizedPrivateMedia(
  asset: AuthorizedPrivateMediaAsset,
  range?: string,
) {
  try {
    return await getR2ObjectStream({
      key: asset.objectKey,
      bucketRole: asset.bucketRole,
      range,
    });
  } catch (error) {
    if (asset.bucketRole !== "private" || !asset.fallbackObjectKey) throw error;
    return getR2ObjectStream({ key: asset.fallbackObjectKey, bucketRole: "public", range });
  }
}

export async function readAuthorizedPrivateMedia(asset: AuthorizedPrivateMediaAsset) {
  try {
    return await getR2Object(asset.objectKey, asset.bucketRole);
  } catch (error) {
    if (asset.bucketRole !== "private" || !asset.fallbackObjectKey) throw error;
    return getR2Object(asset.fallbackObjectKey, "public");
  }
}
