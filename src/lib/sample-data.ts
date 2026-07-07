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
    medium_url: null,
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
    title: "Ivory Study",
    url: "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=1400&q=85",
    thumbnail_url:
      "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=700&q=80",
    width: 1200,
    height: 1600,
    is_cover: true,
  }),
  media({
    id: "10000000-0000-0000-0000-000000000002",
    album_id: "00000000-0000-0000-0000-000000000001",
    media_type: "image",
    title: "Studio Form",
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=85",
    thumbnail_url:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=80",
  }),
  media({
    id: "10000000-0000-0000-0000-000000000003",
    album_id: "00000000-0000-0000-0000-000000000001",
    media_type: "video",
    title: "Motion Test",
    description: "Short editorial motion preview.",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster_url:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80",
    width: 1280,
    height: 720,
    duration_seconds: 6,
    mime_type: "video/mp4",
  }),
  media({
    id: "10000000-0000-0000-0000-000000000004",
    album_id: "00000000-0000-0000-0000-000000000001",
    media_type: "image",
    title: "Taupe Silhouette",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1400&q=85",
    thumbnail_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80",
    width: 1200,
    height: 1500,
  }),
];

export const sampleAlbums: AlbumDetail[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    owner_id: ownerId,
    title: "Ivory Editorial",
    slug: "ivory-editorial",
    description: "A soft studio story shaped by warm light, fabric, and quiet posture.",
    status: "public",
    cover_url: summerMedia[0].thumbnail_url,
    cover_media_id: summerMedia[0].id,
    photo_count: 3,
    video_count: 1,
    media_count: 4,
    like_count: 0,
    comment_count: 0,
    created_at: now,
    updated_at: now,
    media: summerMedia,
    download_allowed: true,
    locked: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    owner_id: ownerId,
    title: "Campaign In Progress",
    slug: "campaign-in-progress",
    description: "A commercial book currently receiving new retouched selects.",
    status: "updating",
    cover_url:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=85",
    cover_media_id: null,
    photo_count: 12,
    video_count: 3,
    media_count: 15,
    like_count: 0,
    comment_count: 0,
    created_at: now,
    updated_at: now,
    media: [
      media({
        id: "20000000-0000-0000-0000-000000000001",
        album_id: "00000000-0000-0000-0000-000000000002",
        media_type: "image",
        url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1400&q=85",
        thumbnail_url:
          "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=700&q=80",
      }),
    ],
    download_allowed: false,
    locked: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    owner_id: ownerId,
    title: "Private Fittings",
    slug: "private-fittings",
    description: "Unreleased client fittings and confidential casting references.",
    status: "private",
    cover_url:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=85",
    cover_media_id: null,
    photo_count: 18,
    video_count: 2,
    media_count: 20,
    like_count: 0,
    comment_count: 0,
    created_at: now,
    updated_at: now,
    media: [],
    download_allowed: false,
    locked: true,
    private_message: "This album is private. Please contact the owner for access.",
  },
];
