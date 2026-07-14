import { unstable_noStore as noStore } from "next/cache";
import { privateAlbumMessage } from "@/lib/config";
import { getPublicSession } from "@/lib/auth";
import { getPublicUrl } from "@/lib/r2";
import { sampleAlbums } from "@/lib/sample-data";
import { supabase } from "@/lib/supabase";
import type { Album, AlbumDetail, AlbumPreviewItem, AlbumStatus, Media } from "@/lib/types";
import { parseMediaSortMode, sortMedia, type MediaSortMode } from "@/lib/media-sort";

import type { PublicSession } from "@/lib/types";

type UnknownRow = Record<string, unknown>;

interface AlbumQuery {
  q?: string;
  status?: AlbumStatus;
  session?: PublicSession | null;
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
  session: PublicSession
): Promise<{ allowed: boolean; reason: "admin" | "all_private_grant" | "selected_album_grant" | "approved_request" | "pending" | "revoked" | "rejected" | "none" }> {
  if (!session.userId && !session.email) {
    return { allowed: false, reason: "none" };
  }

  // 1. Admins bypass all checks
  if (session.isAdmin) return { allowed: true, reason: "admin" };

  const userId = session.userId || null;
  const email = session.email || null;

  // Query all grants for this user/email
  let grantQuery = supabase.from("album_access_grants").select("*");
  if (userId && email) {
    grantQuery = grantQuery.or(`user_id.eq.${userId},email_normalized.eq.${email}`);
  } else if (userId) {
    grantQuery = grantQuery.eq("user_id", userId);
  } else if (email) {
    grantQuery = grantQuery.eq("email_normalized", email);
  }

  const { data: grants } = await grantQuery;

  if (grants && grants.length > 0) {
    // Check for explicit revoke overrides
    const isGlobalRevoked = grants.some(g => g.scope === "all_private" && g.status === "revoked");
    const isAlbumRevoked = grants.some(g => g.scope === "selected_albums" && g.album_id === albumId && g.status === "revoked");

    if (isAlbumRevoked) {
      return { allowed: false, reason: "revoked" };
    }

    // If global is revoked, we can't use an old global grant. BUT a specific selected album grant COULD override a global revoke if granted *after* or *specifically*.
    // The prompt says: "if all_private grant was revoked, user cannot rely on that all-private grant".
    
    // Check for active grants
    const activeSelected = grants.find(g => g.scope === "selected_albums" && g.album_id === albumId && g.status === "active");
    if (activeSelected) {
      return { allowed: true, reason: "selected_album_grant" };
    }

    const activeGlobal = grants.find(g => g.scope === "all_private" && g.status === "active");
    if (activeGlobal) {
      return { allowed: true, reason: "all_private_grant" };
    }
  }

  // Fallback 1: Legacy invites (only if not explicitly revoked via grants)
  if (email) {
    const { data: invites } = await supabase
      .from("album_invites")
      .select("id, is_global")
      .eq("email", email)
      .or(`album_id.eq.${albumId},is_global.eq.true`)
      .limit(1);

    if (invites && invites.length > 0) {
      return { allowed: true, reason: invites[0].is_global ? "all_private_grant" : "selected_album_grant" };
    }
  }

  // Fallback 2: Access requests
  if (userId) {
    const { data: requests } = await supabase
      .from("album_access_requests")
      .select("album_id, requested_album_ids, scope, status")
      .eq("requester_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    for (const req of requests ?? []) {
      const applies =
        req.scope === "all_private" ||
        req.album_id === albumId ||
        (Array.isArray(req.requested_album_ids) && req.requested_album_ids.includes(albumId));

      if (!applies) continue;
      if (req.status === "approved" || req.status === "auto_approved") return { allowed: true, reason: "approved_request" };
      if (req.status === "rejected" || req.status === "denied") return { allowed: false, reason: "rejected" };
      if (req.status === "pending" || req.status === "needs_manual_review") return { allowed: false, reason: "pending" };
    }
  }

  return { allowed: false, reason: "none" };
}

export async function checkAlbumAccess(albumId: string, session: PublicSession): Promise<boolean> {
  const result = await checkPrivateAlbumAccess(albumId, session);
  return result.allowed;
}

function filterSampleAlbums({ q, status, session }: AlbumQuery) {
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

async function attachAlbumPreviews(albums: Album[], session?: PublicSession | null) {
  const isAdmin = session?.isAdmin ?? false;
  
  // Attach access request status if logged in
  const requestMap = new Map<string, string>();
  
  if (session?.userId && !isAdmin) {
    const albumIds = albums.filter(a => a.status === "private").map(a => a.id);
    
    // 1. Check pending requests
    if (albumIds.length > 0) {
      const { data: pendingRequests } = await supabase
        .from("album_access_requests")
        .select("album_id, requested_album_ids, scope, status")
        .eq("requester_user_id", session.userId);
        
      if (pendingRequests) {
        for (const req of pendingRequests) {
          const requestStatus = req.status === "auto_approved" ? "approved" : req.status;
          if (req.scope === "all_private") {
            for (const id of albumIds) {
              if (requestMap.get(id) !== "approved") requestMap.set(id, requestStatus);
            }
            continue;
          }
          const ids = Array.isArray(req.requested_album_ids) && req.requested_album_ids.length
            ? req.requested_album_ids
            : req.album_id
              ? [req.album_id]
              : [];
          for (const id of ids) {
            if (requestMap.get(id) !== "approved") {
              requestMap.set(id, requestStatus);
            }
          }
        }
      }

      // 2. Check active AND revoked user grants
      const { data: userGrants } = await supabase
        .from("album_access_grants")
        .select("album_id, scope, status")
        .eq("user_id", session.userId)
        .or(`album_id.in.(${albumIds.join(",")}),scope.eq.all_private`);
        
      if (userGrants) {
        // Evaluate revoked first
        const globalRevoked = userGrants.some(g => g.scope === "all_private" && g.status === "revoked");
        const revokedMap = new Map<string, boolean>();
        userGrants.forEach(g => {
          if (g.scope === "selected_albums" && g.status === "revoked" && g.album_id) {
            revokedMap.set(g.album_id, true);
          }
        });

        // Evaluate active
        const hasGlobalActive = userGrants.some(g => g.scope === "all_private" && g.status === "active");
        
        albumIds.forEach(id => {
          if (revokedMap.has(id)) {
            requestMap.set(id, "revoked"); // Explicitly revoked
            return;
          }
          if (hasGlobalActive) {
            requestMap.set(id, "approved");
            return;
          }
          const hasSelected = userGrants.some(g => g.scope === "selected_albums" && g.album_id === id && g.status === "active");
          if (hasSelected) {
            requestMap.set(id, "approved");
          }
        });
      }
    }
  }

  // 3. Check email grants (active and revoked)
  if (session?.email && !isAdmin) {
    const { data: emailGrants } = await supabase
      .from("album_access_grants")
      .select("album_id, scope, status")
      .eq("email_normalized", session.email);

    if (emailGrants && emailGrants.length > 0) {
      const globalRevoked = emailGrants.some(g => g.scope === "all_private" && g.status === "revoked");
      const revokedMap = new Map<string, boolean>();
      emailGrants.forEach(g => {
        if (g.scope === "selected_albums" && g.status === "revoked" && g.album_id) {
          revokedMap.set(g.album_id, true);
        }
      });

      const isGlobal = emailGrants.some(g => g.scope === "all_private" && g.status === "active");
      
      albums.filter(a => a.status === "private").forEach(a => {
        if (revokedMap.has(a.id) || requestMap.get(a.id) === "revoked") {
          requestMap.set(a.id, "revoked");
          return;
        }
        if (isGlobal || emailGrants.some(g => g.scope === "selected_albums" && g.album_id === a.id && g.status === "active")) {
          requestMap.set(a.id, "approved");
        }
      });
    }

    // 4. Also check legacy email invites
    const { data: invites } = await supabase
      .from("album_invites")
      .select("album_id, is_global")
      .eq("email", session.email);
    
    if (invites && invites.length > 0) {
      const isGlobal = invites.some(inv => inv.is_global);
      if (isGlobal) {
        albums.filter(a => a.status === "private").forEach(a => {
          requestMap.set(a.id, "approved");
        });
      } else {
        invites.forEach(inv => {
          if (inv.album_id) requestMap.set(inv.album_id, "approved");
        });
      }
    }
  }

  const eligibleAlbumIds = albums
    .filter(a => isAdmin || a.status !== "private" || requestMap.get(a.id) === "approved")
    .map(a => a.id);

  if (!eligibleAlbumIds.length) {
    return albums.map(a => {
      if (a.status === "private" && !isAdmin && requestMap.get(a.id) !== "approved") {
        a.cover_url = null;
      }
      return {
        ...a,
        access_request_status: requestMap.get(a.id) as Album["access_request_status"] ?? null,
      };
    });
  }

  const { data, error } = await supabase
    .from("media")
    .select("id,album_id,media_type,title,url,thumbnail_url,medium_url,poster_url,sort_order,created_at")
    .in("album_id", eligibleAlbumIds)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    return albums.map(a => {
      if (a.status === "private" && !isAdmin && requestMap.get(a.id) !== "approved") {
        a.cover_url = null;
      }
      return {
        ...a,
        access_request_status: requestMap.get(a.id) as Album["access_request_status"] ?? null,
      };
    });
  }

  const previewMap = new Map<string, AlbumPreviewItem[]>();
  for (const row of data as UnknownRow[]) {
    const albumId = String(row.album_id);
    const current = previewMap.get(albumId) ?? [];
    if (current.length >= 4) continue;
    current.push(previewItemFromMedia(row));
    previewMap.set(albumId, current);
  }

  return albums.map((album) => {
    const isApproved = requestMap.get(album.id) === "approved";
    if (album.status === "private" && !isAdmin && !isApproved) {
      album.cover_url = null;
    }
    return {
      ...album,
      access_request_status: requestMap.get(album.id) as Album["access_request_status"] ?? null,
      preview_items: (isAdmin || album.status !== "private" || isApproved) ? (previewMap.get(album.id) ?? []) : [],
    };
  });
}

export async function getAlbums(query: AlbumQuery = {}): Promise<Album[]> {
  noStore();

  try {
    const session = query.session ?? await getPublicSession();
    let builder = supabase
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
    if (error) throw error;
    if (!data?.length) return filterSampleAlbums({ ...query, session });

    let parsedAlbums = data.map((row) => normalizeAlbum(row));
    
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

    return attachAlbumPreviews(parsedAlbums, session);
  } catch {
    return filterSampleAlbums(query);
  }
}

export async function getAlbum(
  slugOrId: string,
  options: { isAdmin?: boolean; sort?: MediaSortMode | string | null } = {},
): Promise<AlbumDetail | null> {
  noStore();

  const session = options.isAdmin === undefined ? await getPublicSession() : null;
  const isAdmin = options.isAdmin ?? session?.isAdmin ?? false;

  try {
    let albumQuery = supabase
      .from("albums")
      .select("*")
      .eq("slug", slugOrId)
      .is("deleted_at", null)
      .maybeSingle();

    if (isUuid(slugOrId)) {
      albumQuery = supabase
        .from("albums")
        .select("*")
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .is("deleted_at", null)
        .maybeSingle();
    }

    const { data: albumRow, error: albumError } = await albumQuery;

    if (albumError) throw albumError;
    if (!albumRow) return null;

    const album = normalizeAlbum(albumRow);

    if (album.status === "private" && !isAdmin) {
      let isApproved = false;
      if (session) {
        isApproved = await checkAlbumAccess(album.id, session);
      }
      
      if (!isApproved) {
        return {
          ...album,
          media: [],
          download_allowed: false,
          locked: true,
          private_message: privateAlbumMessage,
        };
      }
    }

    const { data: mediaRows, error: mediaError } = await supabase
      .from("media")
      .select("*")
      .eq("album_id", album.id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(250);

    if (mediaError) throw mediaError;

    const media = await attachMediaEngagementCounts((mediaRows ?? []).map((row) => normalizeMedia(row)));
    const sortMode = parseMediaSortMode(options.sort, parseMediaSortMode(album.default_media_sort, "smart"));
    const sortedMedia = sortMedia(media, sortMode, `${album.id}:${sortMode}`);

    return {
      ...album,
      media: sortedMedia,
      preview_items: sortedMedia.slice(0, 4).map((item) => ({
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
  } catch {
    const sample = sampleAlbums.find(
      (album) => album.slug === slugOrId || album.id === slugOrId,
    );

    if (!sample) return null;
    if (sample.status === "private" && !isAdmin) {
      return { ...sample, media: [], locked: true, download_allowed: false };
    }

    return sample;
  }
}

async function attachMediaEngagementCounts(media: Media[]) {
  const ids = media.map((item) => item.id);
  if (!ids.length) return media;

  const [likesResult, commentsResult] = await Promise.all([
    supabase.from("likes").select("media_id").in("media_id", ids),
    supabase
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
