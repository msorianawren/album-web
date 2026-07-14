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

import type { PublicSession } from "@/lib/types";

type UnknownRow = Record<string, unknown>;

interface AlbumQuery {
  q?: string;
  status?: AlbumStatus;
  session?: PublicSession | null;
  userClient?: SupabaseClient | null;
}

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
    safe_preview_url: safePreviewUrl,
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
    preview_items: [],
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

function filterSampleAlbums(
  sampleAlbums: AlbumDetail[],
  { q, status, session }: AlbumQuery,
) {
  const search = q?.toLowerCase().trim();
  const isAdmin = session?.isAdmin ?? false;
  return sampleAlbums.filter((album) => {
    const matchesStatus = status ? album.status === status : true;
    const matchesSearch = search
      ? `${album.title} ${album.description ?? ""}`.toLowerCase().includes(search)
      : true;
    return matchesStatus && matchesSearch;
  }).map((album) => {
    if (album.status === "private" && !isAdmin) {
      return {
        ...album,
        preview_items: [],
        cover_url: null,
      };
    }
    return {
      ...album,
      preview_items: album.media.slice(0, 4).map((item) => ({
        id: item.id,
        media_type: item.media_type,
        title: item.title,
        url: item.url,
        thumbnail_url: item.thumbnail_url,
        medium_url: item.medium_url,
        poster_url: item.poster_url,
      })),
    };
  });
}

async function getDemoAlbums(query: AlbumQuery) {
  if (!albumDemoFixturesEnabled()) return null;
  const { sampleAlbums } = await import("@/lib/sample-data");
  return filterSampleAlbums(sampleAlbums, query);
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

async function getPreviewRows(
  client: SupabaseClient,
  albumIds: string[],
  operation: string,
  privateDelivery = false,
) {
  if (!albumIds.length) return [];
  const select = privateDelivery
    ? "id,album_id,media_type,title,sort_order,created_at"
    : "id,album_id,media_type,title,url,thumbnail_url,medium_url,poster_url,sort_order,created_at";
  const { data, error } = await client
    .from("media")
    .select(select)
    .in("album_id", albumIds)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return resolveQueryRows(data, error, operation) as unknown as UnknownRow[];
}

async function attachAlbumPreviews(
  albums: Album[],
  session?: PublicSession | null,
  userClient?: SupabaseClient | null,
) {
  const isAdmin = session?.isAdmin ?? false;
  const requestMap = new Map<string, NonNullable<Album["access_request_status"]>>();
  const privateAlbumIds = albums.filter((album) => album.status === "private").map((album) => album.id);

  if (isAdmin && !session?.isBlocked) {
    privateAlbumIds.forEach((albumId) => requestMap.set(albumId, "approved"));
  } else if (session?.userId && !session.isBlocked && userClient && privateAlbumIds.length) {
    const [grantResult, requestResult, inviteResult] = await Promise.all([
      userClient
        .from("album_access_grants")
        .select("id,album_id,scope,status,revoked_at,granted_at,updated_at,created_at"),
      userClient
        .from("album_access_requests")
        .select("album_id,requested_album_ids,scope,status,created_at")
        .eq("requester_user_id", session.userId)
        .order("created_at", { ascending: false }),
      userClient
        .from("album_invites")
        .select("album_id,is_global")
        .eq("email", session.email ?? ""),
    ]);

    const grants = resolveQueryRows(grantResult.data, grantResult.error, "albums.own_grants");
    const requests = resolveQueryRows(requestResult.data, requestResult.error, "albums.own_requests");
    const invites = resolveQueryRows(inviteResult.data, inviteResult.error, "albums.own_invites");
    const grantTimestamp = (row: UnknownRow) => String(
      row.revoked_at ?? row.granted_at ?? row.updated_at ?? row.created_at ?? "",
    );
    const newestGrant = (rows: UnknownRow[]) => [...rows].sort(
      (left, right) => grantTimestamp(right).localeCompare(grantTimestamp(left)) ||
        String(right.id ?? "").localeCompare(String(left.id ?? "")),
    )[0];
    const globalGrant = newestGrant(
      (grants as UnknownRow[]).filter((grant) => grant.scope === "all_private"),
    );
    const hasGlobalInvite = (invites as UnknownRow[]).some((invite) => invite.is_global === true);

    for (const albumId of privateAlbumIds) {
      const selectedGrant = newestGrant(
        (grants as UnknownRow[]).filter(
          (grant) => grant.scope === "selected_albums" && grant.album_id === albumId,
        ),
      );
      if (selectedGrant?.status === "revoked") {
        requestMap.set(albumId, "revoked");
        continue;
      }
      if (selectedGrant?.status === "active") {
        requestMap.set(albumId, "approved");
        continue;
      }
      if (globalGrant?.status === "revoked") {
        requestMap.set(albumId, "revoked");
        continue;
      }
      if (globalGrant?.status === "active") {
        requestMap.set(albumId, "approved");
        continue;
      }
      if (
        hasGlobalInvite ||
        (invites as UnknownRow[]).some((invite) => invite.album_id === albumId)
      ) {
        requestMap.set(albumId, "approved");
        continue;
      }

      const applicableRequests = (requests as UnknownRow[]).filter((request) =>
        request.scope === "all_private" ||
        request.album_id === albumId ||
        (Array.isArray(request.requested_album_ids) && request.requested_album_ids.includes(albumId)),
      );
      const approvedRequest = applicableRequests.find((request) =>
        request.status === "approved" || request.status === "auto_approved",
      );
      const requestStatus = approvedRequest?.status ?? applicableRequests[0]?.status;
      if (typeof requestStatus === "string") {
        requestMap.set(
          albumId,
          requestStatus === "auto_approved" ? "approved" : requestStatus as NonNullable<Album["access_request_status"]>,
        );
      }
    }
  }

  const publicAlbumIds = albums
    .filter((album) => album.status !== "private")
    .map((album) => album.id);
  const authorizedPrivateAlbumIds = albums
    .filter((album) =>
      album.status === "private" &&
      ((isAdmin && !session?.isBlocked) || requestMap.get(album.id) === "approved"),
    )
    .map((album) => album.id);
  const eligibleAlbumIds = [...publicAlbumIds, ...authorizedPrivateAlbumIds];

  if (!eligibleAlbumIds.length) {
    return albums.map(a => {
      const canReadPrivate = (isAdmin && !session?.isBlocked) || requestMap.get(a.id) === "approved";
      if (a.status === "private" && !canReadPrivate) {
        a.cover_url = a.safe_preview_url ?? null;
      }
      return {
        ...a,
        access_request_status: requestMap.get(a.id) as Album["access_request_status"] ?? null,
      };
    });
  }

  const publicClient = createPublicServerClient();
  const [publicPreviewRows, privatePreviewRows] = await Promise.all([
    getPreviewRows(publicClient, publicAlbumIds, "albums.public_previews"),
    userClient
      ? getPreviewRows(userClient, authorizedPrivateAlbumIds, "albums.private_previews", true)
      : Promise.resolve([]),
  ]);
  const previewRows = [...publicPreviewRows, ...privatePreviewRows];
  const authorizedPrivateAlbumIdSet = new Set(authorizedPrivateAlbumIds);

  const previewMap = new Map<string, AlbumPreviewItem[]>();
  for (const row of previewRows as UnknownRow[]) {
    const albumId = String(row.album_id);
    const current = previewMap.get(albumId) ?? [];
    if (current.length >= 4) continue;
    current.push(
      authorizedPrivateAlbumIdSet.has(albumId)
        ? projectPrivatePreviewForClient({
            id: String(row.id),
            mediaType: row.media_type === "video" ? "video" : "image",
            title: typeof row.title === "string" ? row.title : null,
          })
        : previewItemFromMedia(row),
    );
    previewMap.set(albumId, current);
  }

  return albums.map((album) => {
    const isApproved = requestMap.get(album.id) === "approved";
    const canReadPrivate = (isAdmin && !session?.isBlocked) || isApproved;
    if (album.status === "private") {
      album.cover_url = canReadPrivate
        ? previewMap.get(album.id)?.[0]?.thumbnail_url ?? album.safe_preview_url ?? null
        : album.safe_preview_url ?? null;
    }
    return {
      ...album,
      access_request_status: requestMap.get(album.id) as Album["access_request_status"] ?? null,
      preview_items: (album.status !== "private" || canReadPrivate) ? (previewMap.get(album.id) ?? []) : [],
    };
  });
}

export async function getAlbums(query: AlbumQuery = {}): Promise<Album[]> {
  noStore();

  try {
    const session = query.session ?? await getPublicSession();
    const userClient = query.userClient ?? (
      session?.userId && !session.isBlocked ? await createAuthenticatedUserClient() : null
    );
    const publicClient = createPublicServerClient();
    let builder = publicClient
      .from("albums")
      .select("*")
      .is("deleted_at", null);

    if (query.status) {
      builder = builder.eq("status", query.status);
      if (query.status === "public") builder = builder.order("public_sort_order", { ascending: true, nullsFirst: false });
      else if (query.status === "private") builder = builder.order("private_sort_order", { ascending: true, nullsFirst: false });
      else if (query.status === "updating") builder = builder.order("updating_sort_order", { ascending: true, nullsFirst: false });
    }
    
    builder = builder.order("created_at", { ascending: false });

    if (query.q) {
      const q = `%${query.q}%`;
      builder = builder.or(`title.ilike.${q},description.ilike.${q}`);
    }

    const { data, error } = await builder;
    const rows = resolveQueryRows(data, error, "albums.list");
    if (!rows.length) {
      return (await getDemoAlbums({ ...query, session })) ?? [];
    }

    let parsedAlbums = rows.map((row) => normalizeAlbum(row));
    
    if (!query.status) {
      const getFallbackTime = (a: Album) => new Date(a.created_at).getTime();
      const publicAlbums = parsedAlbums.filter(a => a.status === "public").sort((a, b) => {
        if (a.public_sort_order != null && b.public_sort_order != null) return a.public_sort_order - b.public_sort_order;
        if (a.public_sort_order != null) return -1;
        if (b.public_sort_order != null) return 1;
        return getFallbackTime(b) - getFallbackTime(a);
      });
      const updatingAlbums = parsedAlbums.filter(a => a.status === "updating").sort((a, b) => {
        if (a.updating_sort_order != null && b.updating_sort_order != null) return a.updating_sort_order - b.updating_sort_order;
        if (a.updating_sort_order != null) return -1;
        if (b.updating_sort_order != null) return 1;
        return getFallbackTime(b) - getFallbackTime(a);
      });
      const privateAlbums = parsedAlbums.filter(a => a.status === "private").sort((a, b) => {
        if (a.private_sort_order != null && b.private_sort_order != null) return a.private_sort_order - b.private_sort_order;
        if (a.private_sort_order != null) return -1;
        if (b.private_sort_order != null) return 1;
        return getFallbackTime(b) - getFallbackTime(a);
      });
      parsedAlbums = [...publicAlbums, ...updatingAlbums, ...privateAlbums];
    }

    return attachAlbumPreviews(parsedAlbums, session, userClient);
  } catch (error) {
    const demoAlbums = await getDemoAlbums(query);
    if (demoAlbums) return demoAlbums;
    throw reportAppFailure(classifyDataFailure(error, "albums.list"));
  }
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
        ? privateCover?.thumbnail_url ?? album.safe_preview_url ?? null
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
