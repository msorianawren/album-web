import { unstable_noStore as noStore } from "next/cache";
import { sampleAlbums } from "@/lib/sample-data";
import { supabase } from "@/lib/supabase";
import type { Album, AlbumDetail, AlbumImage } from "@/lib/types";
import { getPublicUrl } from "@/lib/r2";

function normalizeAlbum(row: Record<string, unknown>): Album {
  return {
    id: String(row.id),
    owner_id: typeof row.owner_id === "string" ? row.owner_id : undefined,
    title: String(row.title ?? "Untitled album"),
    slug: String(row.slug ?? row.id),
    description:
      typeof row.description === "string" ? row.description : null,
    cover_image:
      typeof row.cover_image === "string" && row.cover_image.length > 0
        ? resolveImageUrl(row.cover_image)
        : null,
    is_public: Boolean(row.is_public),
    photo_count: Number(row.photo_count ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at:
      typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function normalizeImage(row: Record<string, unknown>): AlbumImage {
  const mediumKey = typeof row.medium_key === "string" ? row.medium_key : null;
  const originalKey =
    typeof row.original_key === "string" ? row.original_key : null;
  const fileUrl =
    typeof row.file_url === "string"
      ? row.file_url
      : mediumKey
        ? getPublicUrl(mediumKey)
        : originalKey
          ? getPublicUrl(originalKey)
          : "";

  return {
    id: String(row.id),
    album_id: String(row.album_id),
    file_name: String(row.file_name ?? "Photo"),
    width: toNullableNumber(row.width),
    height: toNullableNumber(row.height),
    file_size: toNullableNumber(row.file_size),
    content_type:
      typeof row.content_type === "string" ? row.content_type : null,
    blur_hash: typeof row.blur_hash === "string" ? row.blur_hash : null,
    original_key: originalKey,
    medium_key: mediumKey,
    thumb_key: typeof row.thumb_key === "string" ? row.thumb_key : null,
    file_url: resolveImageUrl(fileUrl),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function toNullableNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function resolveImageUrl(value: string) {
  if (value.startsWith("http")) return value;
  return getPublicUrl(value);
}

export async function getAlbums(): Promise<Album[]> {
  noStore();

  try {
    const { data, error } = await supabase
      .from("albums")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data?.length) return sampleAlbums;

    return data.map((row) => normalizeAlbum(row));
  } catch {
    return sampleAlbums;
  }
}

export async function getAlbum(id: string): Promise<AlbumDetail | null> {
  noStore();

  try {
    const albumColumn = /^\d+$/.test(id) ? "id" : "slug";
    const { data: albumRow, error: albumError } = await supabase
      .from("albums")
      .select("*")
      .eq(albumColumn, id)
      .single();

    if (albumError) throw albumError;
    if (!albumRow) return sampleAlbums.find((album) => album.id === id) ?? null;

    const { data: images, error: imagesError } = await supabase
      .from("images")
      .select("*")
      .eq("album_id", albumRow.id)
      .order("created_at", { ascending: true });

    if (imagesError) throw imagesError;

    const normalizedImages = (images ?? []).map((row) => normalizeImage(row));
    return {
      ...normalizeAlbum(albumRow),
      photo_count: normalizedImages.length,
      images: normalizedImages,
    };
  } catch {
    return (
      sampleAlbums.find((album) => album.id === id || album.slug === id) ?? null
    );
  }
}
