import { unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { privateAlbumMessage } from "@/lib/config";
import { getPublicSession } from "@/lib/auth";
import { createPublicServerClient } from "@/lib/db/public";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { getPublicUrl } from "@/lib/r2";
import { albumDemoFixturesEnabled } from "@/lib/demo-fixtures";
import {
  classifyDataFailure,
  reportAppFailure,
  resolveOptionalRow,
  resolveQueryRows,
} from "@/lib/app-failure";
import type { Album, AlbumDetail, AlbumPreviewItem, AlbumStatus, Media } from "@/lib/types";
import { parseMediaSortMode, sortMedia, type MediaSortMode } from "@/lib/media-sort";
import {
  PRIVATE_MEDIA_SAFE_SELECT,
  projectPrivateMediaForClient,
  projectPrivatePreviewForClient,
} from "@/lib/private-media";
import { getMediaDeliveryDescriptor } from "@/lib/media/delivery";

import type { PublicSession } from "@/lib/types";

type UnknownRow = Record<string, unknown>;

export interface AlbumQuery {
  q?: string;
  status?: AlbumStatus;
  session?: PublicSession | null;
  userClient?: SupabaseClient | null;
}

export interface AlbumPage extends AlbumQuery {
  status: AlbumStatus;
  albums: Album[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type AlbumSections = Partial<Record<AlbumStatus, AlbumPage>>;

export interface AlbumPageQuery extends AlbumQuery {
  status: AlbumStatus;
  cursor?: string;
  limit?: number;
}

export interface AlbumSectionsQuery extends AlbumQuery {
  limit?: number;
  cursors?: Partial<Record<AlbumStatus, string | undefined>>;
}

type AlbumCursor = {
  sort: number;
  createdAt: string;
  id: string;
};

function toNullableNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toNullableInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) ? number : 0;
}

function resolveAssetUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("http")) return value;
  return getPublicUrl(value);
}

export function normalizeAlbum(row: UnknownRow): Album {
  const coverUrl =
    resolveAssetUrl(row.cover_url) ??
    resolveAssetUrl(row.cover_image) ??
    null;

  const legacyIsPublic = row.is_public;
  const status =
    typeof row.status === "string"
      ? row.status
      : legacyIsPublic === false
        ? "private"
        : "public";

  const safePreviewUrl = resolveAssetUrl(row.safe_preview_url);
  const accessRequestStatus =
    typeof row.access_request_status === "string"
      ? row.access_request_status as Album["access_request_status"]
      : null;
  const previewItems = Array.isArray(row.preview_items)
    ? row.preview_items
      .filter((item): item is UnknownRow => Boolean(item) && typeof item === "object")
      .map(previewItemFromMedia)
    : [];

  return {
    id: String(row.id),
    owner_id: typeof row.owner_id === "string" ? row.owner_id : undefined,
    title: String(row.title ?? "Untitled album"),
    slug: String(row.slug ?? row.id),
    description: typeof row.description === "string" ? row.description : null,
    status: status as AlbumStatus,
    cover_url: coverUrl,
    cover_media_id:
      typeof row.cover_media_id === "string" ? row.cover_media_id : null,
    feather_purchase_enabled: row.feather_purchase_enabled !== false,
    feather_price: toNullableNumber(row.feather_price),
    effective_feather_price: toNullableNumber(row.effective_feather_price),
    safe_preview_url: safePreviewUrl,
    access_request_status: accessRequestStatus,
    photo_count: Number(row.photo_count ?? 0),
    video_count: Number(row.video_count ?? 0),
    media_count: Number(row.media_count ?? row.photo_count ?? 0),
    like_count: Number(row.like_count ?? 0),
    comment_count: Number(row.comment_count ?? 0),
    default_media_sort:
      typeof row.default_media_sort === "string" ? row.default_media_sort : null,
    public_sort_order: toNullableInteger(row.public_sort_order),
    private_sort_order: toNullableInteger(row.private_sort_order),
    updating_sort_order: toNullableInteger(row.updating_sort_order),
    order_updated_at: typeof row.order_updated_at === "string" ? row.order_updated_at : null,
    order_updated_by: typeof row.order_updated_by === "string" ? row.order_updated_by : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at:
      typeof row.updated_at === "string" ? row.updated_at : undefined,
    preview_items: previewItems,
  };
}

function previewItemFromMedia(row: UnknownRow): AlbumPreviewItem {
  return {
    id: String(row.id),
    media_type: row.media_type === "video" ? "video" : "image",
    title: typeof row.title === "string" ? row.title : null,
    url: resolveAssetUrl(row.url) ?? "",
    thumbnail_url: resolveAssetUrl(row.thumbnail_url),
    medium_url: resolveAssetUrl(row.medium_url),
    poster_url: resolveAssetUrl(row.poster_url),
  };
}

export function normalizeMedia(row: UnknownRow): Media {
  const url = resolveAssetUrl(row.url) ?? resolveAssetUrl(row.file_url) ?? "";

  return {
    id: String(row.id),
    album_id: String(row.album_id),
    owner_id: String(row.owner_id ?? ""),
    media_type: row.media_type === "video" ? "video" : "image",
    title: typeof row.title === "string" ? row.title : null,
    description: typeof row.description === "string" ? row.description : null,
    r2_key: String(row.r2_key ?? row.original_key ?? ""),
    url,
    thumbnail_url: resolveAssetUrl(row.thumbnail_url ?? row.thumb_key),
    medium_url: resolveAssetUrl(row.medium_url),
    poster_url: resolveAssetUrl(row.poster_url),
    width: toNullableNumber(row.width),
    height: toNullableNumber(row.height),
    duration_seconds: toNullableNumber(row.duration_seconds),
    file_size: toNullableNumber(row.file_size),
    mime_type: typeof row.mime_type === "string" ? row.mime_type : null,
    original_filename: typeof row.original_filename === "string" ? row.original_filename : null,
    safe_display_name: typeof row.safe_display_name === "string" ? row.safe_display_name : null,
    uploaded_at: typeof row.uploaded_at === "string" ? row.uploaded_at : null,
    taken_at: typeof row.taken_at === "string" ? row.taken_at : null,
    sort_date: typeof row.sort_date === "string" ? row.sort_date : null,
    aspect_ratio: toNullableNumber(row.aspect_ratio),
    orientation: ["portrait", "landscape", "square", "unknown"].includes(row.orientation as string)
      ? (row.orientation as Media["orientation"])
      : null,
    file_extension: typeof row.file_extension === "string" ? row.file_extension : null,
    original_file_size: toNullableNumber(row.original_file_size),
    original_mime_type: typeof row.original_mime_type === "string" ? row.original_mime_type : null,
    featured_rank: toNullableInteger(row.featured_rank),
    view_count: toNullableInteger(row.view_count),
    like_count: toNullableInteger(row.like_count),
    comment_count: toNullableInteger(row.comment_count),
    metadata_status:
      typeof row.metadata_status === "string"
        ? (row.metadata_status as Media["metadata_status"])
        : "unavailable",
    processing_status:
      typeof row.processing_status === "string"
        ? (row.processing_status as Media["processing_status"])
        : "processed",
    content_hash: typeof row.content_hash === "string" ? row.content_hash : null,
    duplicate_of_media_id:
      typeof row.duplicate_of_media_id === "string" ? row.duplicate_of_media_id : null,
    blurhash: typeof row.blurhash === "string" ? row.blurhash : null,
    large_r2_key: typeof row.large_r2_key === "string" ? row.large_r2_key : null,
    large_url: resolveAssetUrl(row.large_url),
    processing_version: toNullableInteger(row.processing_version),
    processed_at: typeof row.processed_at === "string" ? row.processed_at : null,
    public_r2_key: typeof row.public_r2_key === "string" ? row.public_r2_key : null,
    original_private_r2_key:
      typeof row.original_private_r2_key === "string" ? row.original_private_r2_key : null,
    security_status:
      typeof row.security_status === "string"
        ? (row.security_status as Media["security_status"])
        : "processed",
    security_notes: typeof row.security_notes === "string" ? row.security_notes : null,
    download_allowed: row.download_allowed !== false,
    original_download_allowed: Boolean(row.original_download_allowed),
    metadata_stripped: Boolean(row.metadata_stripped),
    deleted_at: typeof row.deleted_at === "string" ? row.deleted_at : null,
    deleted_by: typeof row.deleted_by === "string" ? row.deleted_by : null,
    delete_reason: typeof row.delete_reason === "string" ? row.delete_reason : null,
    sort_order: Number(row.sort_order ?? 0),
    is_cover: Boolean(row.is_cover),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at:
      typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function checkPrivateAlbumAccess(
  albumId: string,
  session: PublicSession,
  userClient: SupabaseClient | null,
): Promise<{ allowed: boolean; reason: "admin" | "all_private_grant" | "selected_album_grant" | "approved_request" | "pending" | "revoked" | "rejected" | "none" }> {
  if (session.isBlocked || !session.userId || !userClient) {
    return { allowed: false, reason: "none" };
  }

  const { data, error } = await userClient.rpc("can_access_private_album", {
    target_album_id: albumId,
  });
  if (error) throw classifyDataFailure(error, "albums.private_access");
  return data === true
    ? { allowed: true, reason: session.isAdmin ? "admin" : "approved_request" }
    : { allowed: false, reason: "none" };
}

export async function checkAlbumAccess(
  albumId: string,
  session: PublicSession,
  userClient: SupabaseClient | null,
): Promise<boolean> {
  const result = await checkPrivateAlbumAccess(albumId, session, userClient);
  return result.allowed;
}

async function getDemoAlbum(slugOrId: string, isAdmin: boolean) {
  if (!albumDemoFixturesEnabled()) return null;
  const { sampleAlbums } = await import("@/lib/sample-data");
  const sample = sampleAlbums.find(
    (album) => album.slug === slugOrId || album.id === slugOrId,
  );
  if (!sample) return null;
  if (sample.status === "private" && !isAdmin) {
    return { ...sample, media: [], locked: true, download_allowed: false };
  }
  return sample;
}

function decodeAlbumCursor(cursor: string | undefined): AlbumCursor | null {
  if (!cursor || cursor.length > 512) return null;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<AlbumCursor>;
    const sort = parsed.sort;
    const createdAt = typeof parsed.createdAt === "string" ? new Date(parsed.createdAt) : null;
    if (
      typeof sort !== "number" ||
      !Number.isInteger(sort) ||
      !createdAt ||
      Number.isNaN(createdAt.getTime()) ||
      typeof parsed.id !== "string" ||
      !isUuid(parsed.id)
    ) {
      return null;
    }
    return { sort, createdAt: createdAt.toISOString(), id: parsed.id };
  } catch {
    return null;
  }
}

function encodeAlbumCursor(row: UnknownRow) {
  const sort = toNullableInteger(row.pagination_sort_order);
  const createdAt = typeof row.created_at === "string" ? row.created_at : null;
  const id = typeof row.id === "string" ? row.id : null;
  if (!createdAt || !id || !isUuid(id)) return null;
  return Buffer.from(JSON.stringify({ sort, createdAt, id }), "utf8").toString("base64url");
}

function normalizePageLimit(limit: number | undefined) {
  const requested = typeof limit === "number" && Number.isFinite(limit) ? limit : 24;
  return Math.min(Math.max(Math.trunc(requested), 1), 96);
}

export async function getAlbumPage(query: AlbumPageQuery): Promise<AlbumPage> {
  noStore();
  const session = query.session ?? await getPublicSession();
  const userClient = query.userClient ?? (
    session?.userId && !session.isBlocked ? await createAuthenticatedUserClient() : null
  );
  const client = userClient ?? createPublicServerClient();
  const limit = normalizePageLimit(query.limit);
  const cursor = decodeAlbumCursor(query.cursor);

  const { data, error } = await client.rpc("list_album_summaries", {
    p_status: query.status,
    p_query: query.q?.trim() || null,
    p_limit: limit,
    p_cursor_sort: cursor?.sort ?? null,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_id: cursor?.id ?? null,
  });
  const rows = resolveQueryRows(data, error, "albums.list_page") as UnknownRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = pageRows.at(-1);
  const albums = pageRows.map(normalizeAlbum).map((album) => (
    album.status === "private" && album.access_request_status === "approved"
      ? {
          ...album,
          preview_items: (album.preview_items ?? []).map((item) =>
            projectPrivatePreviewForClient({
              id: item.id,
              mediaType: item.media_type,
              title: item.title,
            }),
          ),
        }
      : album
  ));

  return {
    status: query.status,
    albums,
    nextCursor: hasMore && lastRow ? encodeAlbumCursor(lastRow) : null,
    hasMore,
  };
}

export async function getAlbumSections(
  query: AlbumSectionsQuery = {},
): Promise<AlbumSections> {
  const statuses: AlbumStatus[] = query.status ? [query.status] : ["public", "updating", "private"];
  const entries = await Promise.all(
    statuses.map(async (status) => [
      status,
      await getAlbumPage({
        ...query,
        status,
        cursor: query.cursors?.[status],
      }),
    ] as const),
  );
  return Object.fromEntries(entries) as AlbumSections;
}

export async function getFeaturedAlbums(limit = 4) {
  const page = await getAlbumPage({ status: "public", limit });
  return page.albums;
}

export async function getAlbum(
  slugOrId: string,
  options: {
    isAdmin?: boolean;
    sort?: MediaSortMode | string | null;
    userClient?: SupabaseClient | null;
  } = {},
): Promise<AlbumDetail | null> {
  noStore();

  const session = options.isAdmin === undefined ? await getPublicSession() : null;
  const isAdmin = options.isAdmin ?? session?.isAdmin ?? false;
  const userClient = options.userClient ?? (
    (session?.userId || isAdmin) ? await createAuthenticatedUserClient() : null
  );

  try {
    const publicClient = createPublicServerClient();
    let albumQuery = publicClient
      .from("albums")
      .select("*")
      .eq("slug", slugOrId)
      .is("deleted_at", null)
      .maybeSingle();

    if (isUuid(slugOrId)) {
      albumQuery = publicClient
        .from("albums")
        .select("*")
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .is("deleted_at", null)
        .maybeSingle();
    }

    const { data, error } = await albumQuery;
    const albumRow = resolveOptionalRow(data, error, "albums.detail");
    if (!albumRow) return getDemoAlbum(slugOrId, isAdmin);

    const album = normalizeAlbum(albumRow);

    if (album.status === "private" && !userClient) {
      return {
        ...album,
        cover_url: album.safe_preview_url ?? null,
        media: [],
        download_allowed: false,
        locked: true,
        private_message: privateAlbumMessage,
      };
    }

    if (album.status === "private") {
      const { data: canReadPrivate, error: accessError } = await userClient!.rpc(
        "can_access_private_album",
        { target_album_id: album.id },
      );
      if (accessError) throw classifyDataFailure(accessError, "albums.private_access");
      if (canReadPrivate !== true) {
        return {
          ...album,
          cover_url: album.safe_preview_url ?? null,
          media: [],
          download_allowed: false,
          locked: true,
          private_message: privateAlbumMessage,
        };
      }
    }

    const mediaClient = album.status === "private" ? userClient! : publicClient;
    const mediaSelect = album.status === "private" ? PRIVATE_MEDIA_SAFE_SELECT : "*";
    const { data: mediaRows, error: mediaError } = await mediaClient
      .from("media")
      .select(mediaSelect)
      .eq("album_id", album.id)
      .is("deleted_at", null)
      .in("processing_status", ["ready", "processed"])
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(250);

    if (mediaError) throw mediaError;

    const media = await attachMediaEngagementCounts(
      (mediaRows ?? []).map((row) => normalizeMedia(row as unknown as UnknownRow)),
      mediaClient,
    );
    const sortMode = parseMediaSortMode(options.sort, parseMediaSortMode(album.default_media_sort, "smart"));
    const sortedMedia = sortMedia(media, sortMode, `${album.id}:${sortMode}`);
    const deliveredMedia =
      album.status === "private"
        ? sortedMedia.map(projectPrivateMediaForClient)
        : sortedMedia;
    const privateCover = album.status === "private"
      ? deliveredMedia.find((item) => item.id === album.cover_media_id || item.is_cover) ?? deliveredMedia[0]
      : null;

    return {
      ...album,
      cover_url: album.status === "private"
        ? privateCover
          ? getMediaDeliveryDescriptor(privateCover, {
              albumStatus: "private",
              isAuthorized: true,
            }).card.src ?? album.safe_preview_url ?? null
          : album.safe_preview_url ?? null
        : album.cover_url,
      media: deliveredMedia,
      preview_items: deliveredMedia.slice(0, 4).map((item) => ({
        id: item.id,
        media_type: item.media_type,
        title: item.title,
        url: item.url,
        thumbnail_url: item.thumbnail_url,
        medium_url: item.medium_url,
        poster_url: item.poster_url,
      })),
      media_count: sortedMedia.length || album.media_count,
      photo_count: sortedMedia.filter((item) => item.media_type === "image").length || album.photo_count,
      video_count: sortedMedia.filter((item) => item.media_type === "video").length || album.video_count,
      download_allowed: album.status === "public" || isAdmin,
      locked: false,
    };
  } catch (error) {
    const demoAlbum = await getDemoAlbum(slugOrId, isAdmin);
    if (demoAlbum) return demoAlbum;
    throw reportAppFailure(classifyDataFailure(error, "albums.detail"));
  }
}

async function attachMediaEngagementCounts(
  media: Media[],
  client: SupabaseClient = createPublicServerClient(),
) {
  const ids = media.map((item) => item.id);
  if (!ids.length) return media;

  const [likesResult, commentsResult] = await Promise.all([
    client.from("likes").select("media_id").in("media_id", ids),
    client
      .from("comments")
      .select("media_id")
      .in("media_id", ids)
      .eq("is_hidden", false)
      .is("deleted_at", null),
  ]);

  const likeCounts = new Map<string, number>();
  for (const row of likesResult.data ?? []) {
    if (row.media_id) likeCounts.set(row.media_id, (likeCounts.get(row.media_id) ?? 0) + 1);
  }

  const commentCounts = new Map<string, number>();
  for (const row of commentsResult.data ?? []) {
    if (row.media_id) commentCounts.set(row.media_id, (commentCounts.get(row.media_id) ?? 0) + 1);
  }

  return media.map((item) => ({
    ...item,
    like_count: likeCounts.get(item.id) ?? item.like_count ?? 0,
    comment_count: commentCounts.get(item.id) ?? item.comment_count ?? 0,
  }));
}
