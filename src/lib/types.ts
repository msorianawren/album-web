export type AlbumStatus = "public" | "updating" | "private";
export type MediaType = "image" | "video";

export interface Album {
  id: string;
  owner_id?: string;
  title: string;
  slug: string;
  description: string | null;
  status: AlbumStatus;
  cover_url: string | null;
  cover_media_id: string | null;
  photo_count: number;
  video_count: number;
  media_count: number;
  created_at: string;
  updated_at?: string;
}

export interface Media {
  id: string;
  album_id: string;
  owner_id: string;
  media_type: MediaType;
  title: string | null;
  description: string | null;
  r2_key: string;
  url: string;
  thumbnail_url: string | null;
  poster_url: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  file_size: number | null;
  mime_type: string | null;
  original_filename: string | null;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Comment {
  id: string;
  album_id: string;
  media_id: string | null;
  author_name: string | null;
  body: string;
  is_hidden: boolean;
  created_at: string;
}

export interface Like {
  id: string;
  album_id: string | null;
  media_id: string | null;
  client_id: string | null;
  user_id: string | null;
  created_at: string;
}

export interface AlbumDetail extends Album {
  media: Media[];
  download_allowed: boolean;
  locked: boolean;
  private_message?: string;
}

export interface UploadResult {
  media: Media[];
}

export interface PublicSession {
  userId: string | null;
  isAdmin: boolean;
}
