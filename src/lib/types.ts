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
  like_count: number;
  comment_count: number;
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
  medium_url: string | null;
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

export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  provider: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  blocked_by: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  path: string | null;
  method: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UploadResult {
  media: Media[];
}

export interface PublicSession {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isBlocked: boolean;
  blockedReason: string | null;
}

export interface LandingPageContent {
  id: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  body: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  hero_image_url: string;
  portrait_image_url: string;
  gallery_image_url: string;
  feature_title: string;
  feature_body: string;
  stat_one_label: string;
  stat_one_value: string;
  stat_two_label: string;
  stat_two_value: string;
  stat_three_label: string;
  stat_three_value: string;
  updated_at?: string;
}
