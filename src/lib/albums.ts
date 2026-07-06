import { unstable_noStore as noStore } from "next/cache";
import { privateAlbumMessage } from "@/lib/config";
import { getPublicSession } from "@/lib/auth";
import { getPublicUrl } from "@/lib/r2";
import { sampleAlbums } from "@/lib/sample-data";
import { supabase } from "@/lib/supabase";
import type { Album, AlbumDetail, AlbumStatus, Media } from "@/lib/types";

type UnknownRow = Record<string, unknown>;

interface AlbumQuery {
  q?: string;
  status?: AlbumStatus;
}

function toNullableNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
    photo_count: Number(row.photo_count ?? 0),
    video_count: Number(row.video_count ?? 0),
    media_count: Number(row.media_count ?? row.photo_count ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at:
      typeof row.updated_at === "string" ? row.updated_at : undefined,
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
    poster_url: resolveAssetUrl(row.poster_url),
    width: toNullableNumber(row.width),
    height: toNullableNumber(row.height),
    duration_seconds: toNullableNumber(row.duration_seconds),
    file_size: toNullableNumber(row.file_size),
    mime_type:
      typeof row.mime_type === "string"
        ? row.mime_type
        : typeof row.content_type === "string"
          ? row.content_type
          : null,
    original_filename:
      typeof row.original_filename === "string"
        ? row.original_filename
        : typeof row.file_name === "string"
          ? row.file_name
          : null,
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

function filterSampleAlbums({ q, status }: AlbumQuery) {
  const search = q?.toLowerCase().trim();
  return sampleAlbums.filter((album) => {
    const matchesStatus = status ? album.status === status : true;
    const matchesSearch = search
      ? `${album.title} ${album.description ?? ""}`.toLowerCase().includes(search)
      : true;
    return matchesStatus && matchesSearch;
  });
}

export async function getAlbums(query: AlbumQuery = {}): Promise<Album[]> {
  noStore();

  try {
    let builder = supabase
      .from("albums")
      .select(
        "id,owner_id,title,slug,description,status,cover_url,cover_media_id,photo_count,video_count,media_count,created_at,updated_at",
      )
      .order("created_at", { ascending: false });

    if (query.status) builder = builder.eq("status", query.status);
    if (query.q) {
      const q = `%${query.q}%`;
      builder = builder.or(`title.ilike.${q},description.ilike.${q}`);
    }

    const { data, error } = await builder;
    if (error) throw error;
    if (!data?.length) return filterSampleAlbums(query);

    return data.map((row) => normalizeAlbum(row));
  } catch {
    return filterSampleAlbums(query);
  }
}

export async function getAlbum(
  slugOrId: string,
  options: { isAdmin?: boolean } = {},
): Promise<AlbumDetail | null> {
  noStore();

  const session = options.isAdmin === undefined ? await getPublicSession() : null;
  const isAdmin = options.isAdmin ?? session?.isAdmin ?? false;

  try {
    let albumQuery = supabase
      .from("albums")
      .select("*")
      .eq("slug", slugOrId)
      .maybeSingle();

    if (isUuid(slugOrId)) {
      albumQuery = supabase
        .from("albums")
        .select("*")
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .maybeSingle();
    }

    const { data: albumRow, error: albumError } = await albumQuery;

    if (albumError) throw albumError;
    if (!albumRow) return null;

    const album = normalizeAlbum(albumRow);

    if (album.status === "private" && !isAdmin) {
      return {
        ...album,
        media: [],
        download_allowed: false,
        locked: true,
        private_message: privateAlbumMessage,
      };
    }

    const { data: mediaRows, error: mediaError } = await supabase
      .from("media")
      .select("*")
      .eq("album_id", album.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(250);

    if (mediaError) throw mediaError;

    const media = (mediaRows ?? []).map((row) => normalizeMedia(row));

    return {
      ...album,
      media,
      media_count: media.length || album.media_count,
      photo_count: media.filter((item) => item.media_type === "image").length || album.photo_count,
      video_count: media.filter((item) => item.media_type === "video").length || album.video_count,
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
