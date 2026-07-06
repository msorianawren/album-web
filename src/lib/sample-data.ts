import type { AlbumDetail, Media } from "@/lib/types";

const now = new Date("2026-07-07T09:00:00.000Z").toISOString();
const ownerId = "00000000-0000-0000-0000-000000000000";

function media(partial: Partial<Media> & Pick<Media, "id" | "album_id" | "media_type" | "url">): Media {
  return {
    owner_id: ownerId,
    title: null,
    description: null,
    r2_key: "",
    thumbnail_url: null,
    poster_url: null,
    width: partial.media_type === "image" ? 1200 : null,
    height: partial.media_type === "image" ? 900 : null,
    duration_seconds: partial.media_type === "video" ? 18 : null,
    file_size: null,
    mime_type: partial.media_type === "video" ? "video/mp4" : "image/jpeg",
    original_filename: null,
    sort_order: 0,
    is_cover: false,
    created_at: now,
    ...partial,
  };
}

const summerMedia = [
  media({
    id: "10000000-0000-0000-0000-000000000001",
    album_id: "00000000-0000-0000-0000-000000000001",
    media_type: "image",
    title: "Shoreline",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85",
    thumbnail_url:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80",
    width: 1200,
    height: 1600,
    is_cover: true,
  }),
  media({
    id: "10000000-0000-0000-0000-000000000002",
    album_id: "00000000-0000-0000-0000-000000000001",
    media_type: "image",
    title: "Cliff Walk",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85",
    thumbnail_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80",
  }),
  media({
    id: "10000000-0000-0000-0000-000000000003",
    album_id: "00000000-0000-0000-0000-000000000001",
    media_type: "video",
    title: "Blue Hour Walk",
    description: "Short travel clip preview.",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster_url:
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=900&q=80",
    width: 1280,
    height: 720,
    duration_seconds: 6,
    mime_type: "video/mp4",
  }),
  media({
    id: "10000000-0000-0000-0000-000000000004",
    album_id: "00000000-0000-0000-0000-000000000001",
    media_type: "image",
    title: "Poolside",
    url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1400&q=85",
    thumbnail_url:
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=700&q=80",
    width: 1200,
    height: 1500,
  }),
];

export const sampleAlbums: AlbumDetail[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    owner_id: ownerId,
    title: "Summer Vacation",
    slug: "summer-vacation",
    description: "Golden coastlines, slow mornings, and family snapshots.",
    status: "public",
    cover_url: summerMedia[0].thumbnail_url,
    cover_media_id: summerMedia[0].id,
    photo_count: 3,
    video_count: 1,
    media_count: 4,
    created_at: now,
    updated_at: now,
    media: summerMedia,
    download_allowed: true,
    locked: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    owner_id: ownerId,
    title: "City Lights",
    slug: "city-lights",
    description: "A late-night street edit currently receiving new uploads.",
    status: "updating",
    cover_url:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=85",
    cover_media_id: null,
    photo_count: 12,
    video_count: 3,
    media_count: 15,
    created_at: now,
    updated_at: now,
    media: [
      media({
        id: "20000000-0000-0000-0000-000000000001",
        album_id: "00000000-0000-0000-0000-000000000002",
        media_type: "image",
        url: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=85",
        thumbnail_url:
          "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=700&q=80",
      }),
    ],
    download_allowed: false,
    locked: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    owner_id: ownerId,
    title: "Quiet Studio",
    slug: "quiet-studio",
    description: "Private client references and unpublished product tests.",
    status: "private",
    cover_url:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=85",
    cover_media_id: null,
    photo_count: 18,
    video_count: 2,
    media_count: 20,
    created_at: now,
    updated_at: now,
    media: [],
    download_allowed: false,
    locked: true,
    private_message: "This album is private. Please contact the owner for access.",
  },
];
