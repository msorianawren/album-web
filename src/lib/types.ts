export interface Album {
  id: string;
  owner_id?: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  is_public: boolean;
  photo_count: number;
  created_at: string;
  updated_at?: string;
}

export interface AlbumImage {
  id: string;
  album_id: string;
  file_name: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  content_type: string | null;
  blur_hash: string | null;
  original_key: string | null;
  medium_key: string | null;
  thumb_key: string | null;
  file_url: string;
  created_at: string;
  is_favorite?: boolean;
}

export interface AlbumDetail extends Album {
  images: AlbumImage[];
}

export interface UploadResult {
  image: AlbumImage;
  variants: {
    original: string;
    medium: string;
    thumb: string;
  };
}
