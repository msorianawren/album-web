export type AlbumStatus = "public" | "updating" | "private";
export type MediaType = "image" | "video";
export type UserRole = "founder" | "admin" | "user" | "guest";

export interface AlbumPreviewItem {
  id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  medium_url: string | null;
  poster_url: string | null;
  title: string | null;
}

export interface Album {
  id: string;
  owner_id?: string;
  title: string;
  slug: string;
  description: string | null;
  status: AlbumStatus;
  cover_url: string | null;
  cover_media_id: string | null;
  safe_preview_url?: string | null;
  access_request_status?: "pending" | "approved" | "rejected" | null;
  photo_count: number;
  video_count: number;
  media_count: number;
  like_count: number;
  comment_count: number;
  default_media_sort?: string | null;
  created_at: string;
  updated_at?: string;
  translations?: Record<string, any>;
  preview_items?: AlbumPreviewItem[];
}

export interface AlbumAccessRequest {
  id: string;
  album_id: string;
  requester_user_id: string | null;
  requester_email: string | null;
  requester_name: string;
  requester_phone: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
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
  safe_display_name?: string | null;
  uploaded_at?: string | null;
  taken_at?: string | null;
  sort_date?: string | null;
  aspect_ratio?: number | null;
  orientation?: "portrait" | "landscape" | "square" | "unknown" | null;
  file_extension?: string | null;
  original_file_size?: number | null;
  original_mime_type?: string | null;
  featured_rank?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  metadata_status?: "extracted" | "fallback" | "unavailable" | "failed";
  processing_status?: "processed" | "failed" | "pending";
  public_r2_key?: string | null;
  original_private_r2_key?: string | null;
  security_status?: "processed" | "needs_review" | "rejected";
  security_notes?: string | null;
  download_allowed?: boolean;
  original_download_allowed?: boolean;
  metadata_stripped?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  delete_reason?: string | null;
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
  author_user_id?: string | null;
  author_email?: string | null;
  client_id?: string | null;
  ip_hash?: string | null;
  body: string;
  is_hidden: boolean;
  moderation_status?: "visible" | "pending" | "hidden" | "deleted";
  moderation_reason?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  delete_reason?: string | null;
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
  role?: UserRole;
  promoted_by?: string | null;
  promoted_at?: string | null;
  revoked_by?: string | null;
  revoked_at?: string | null;
  last_role_changed_at?: string | null;
  role_change_reason?: string | null;
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

export interface LandingSocialLink {
  id: string;
  platform: string;
  url: string;
  label?: string | null;
  enabled: boolean;
  order: number;
}

export interface LandingMediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  alt: string | null;
  caption: string | null;
  title: string | null;
  poster_url: string | null;
  enabled: boolean;
  order: number;
}

export interface CollaboratorProfile {
  id: string;
  name: string;
  role: string;
  portrait_url: string | null;
  bio: string | null;
  portfolio_url: string | null;
  enabled: boolean;
  order: number;
}

export interface LandingBackgroundSettings {
  enabled: boolean;
  preset: "sakura" | "fireflies" | "snow" | "autumn" | "mist" | "rain";
  intensity: number;
  opacity: number;
  speed: number;
  density: number;
  blur: number;
  accent_color_1: string | null;
  accent_color_2: string | null;
  custom_url: string | null;
  apply_to_all_public_pages: boolean;
  enable_surface_accumulation?: boolean;
  accumulation_delay_seconds?: number;
}

export interface PublicSession {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isAdmin: boolean;
  isFounder: boolean;
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
  social_links: LandingSocialLink[];
  media_items: LandingMediaItem[];
  collaborators: CollaboratorProfile[];
  background_settings: LandingBackgroundSettings;
  translations?: Record<string, any>;
  section_toggles?: Record<string, boolean>;
  updated_at?: string;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  site_description: string;
  site_logo_url: string | null;
  site_logo_alt: string | null;
  site_favicon_url: string | null;
  contact_email: string | null;
  default_album_status: AlbumStatus;
  allow_public_comments: boolean;
  allow_public_likes: boolean;
  allow_public_downloads: boolean;
  require_comment_name: boolean;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  default_theme: "dark" | "light" | "system";
  homepage_layout: "featured" | "grid" | "minimal";
  homepage_hero_preset: string;
  social_tree_style: string;
  collaborator_mode: string;
  homepage_gallery_mode: string;
  album_card_density: "comfortable" | "compact";
  album_list_layout: string;
  album_viewer_style: string;
  show_counts_on_cards: boolean;
  show_updated_date: boolean;
  show_status_badges: boolean;
  default_sort_order: "newest" | "oldest" | "title";
  albums_per_page: number;
  media_per_page: number;
  enable_video_uploads: boolean;
  enable_image_uploads: boolean;
  max_image_size_mb: number;
  max_video_size_mb: number;
  max_upload_files_per_batch: number;
  max_album_storage_mb: number;
  max_image_pixels: number;
  max_video_duration_seconds: number;
  max_video_resolution_pixels: number;
  auto_set_first_image_as_cover: boolean;
  show_video_posters: boolean;
  use_thumbnails_in_grid: boolean;
  max_comment_length: number;
  comment_rate_limit_count: number;
  comment_rate_limit_window_seconds: number;
  like_rate_limit_count: number;
  like_rate_limit_window_seconds: number;
  upload_rate_limit_count: number;
  upload_rate_limit_window_seconds: number;
  download_rate_limit_count: number;
  download_rate_limit_window_seconds: number;
  admin_mutation_rate_limit_count: number;
  admin_mutation_rate_limit_window_seconds: number;
  block_duplicate_comments: boolean;
  block_comment_links: boolean;
  moderate_suspicious_comments: boolean;
  strip_image_metadata: boolean;
  store_private_originals: boolean;
  allow_original_downloads: boolean;
  enable_media_watermark: boolean;
  watermark_text: string | null;
  disable_public_right_click: boolean;
  enable_soft_delete: boolean;
  soft_delete_retention_days: number;
  enable_likes: boolean;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  twitter_card: "summary" | "summary_large_image";
  footer_description: string;
  footer_note: string;
  updated_at?: string;
}

export interface StudioMediaItem extends Media {
  album_title: string | null;
  album_slug: string | null;
  album_status: string | null;
}

export interface StudioCommentItem {
  id: string;
  album_id: string;
  media_id: string | null;
  author_name: string | null;
  body: string;
  is_hidden: boolean;
  created_at: string;
  album_title: string | null;
  album_slug: string | null;
}

export interface EducationItem {
  id: string;
  school: string;
  program: string;
  period: string;
  description: string;
}

export interface CareerItem {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  year: string;
  description: string;
}

export interface HobbyItem {
  id: string;
  name: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency: string;
}

export interface PersonalMetrics {
  age?: string;
  height?: string;
  weight?: string;
  measurements?: string;
  iq?: string;
  eq?: string;
}

export interface SocialLinkItem {
  id: string;
  platform: string;
  url: string;
}

export interface AboutProfile {
  id: string;
  display_name: string | null;
  professional_title: string | null;
  tagline: string | null;
  short_bio: string | null;
  full_bio: string | null;
  birthplace: string | null;
  location: string | null;
  nationality: string | null;
  education: EducationItem[];
  career: CareerItem[];
  hobbies: HobbyItem[];
  languages: LanguageItem[];
  achievements: AchievementItem[];
  skills: string[];
  personal_metrics: PersonalMetrics;
  personality_traits: string[];
  relationship_status: string | null;
  quote: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  gallery_media_ids: string[];
  primary_cta_label: string | null;
  primary_cta_href: string | null;
  secondary_cta_label: string | null;
  secondary_cta_href: string | null;
  social_links: SocialLinkItem[];
  is_public: boolean;
  section_toggles?: Record<string, boolean>;
  updated_at?: string;
  _is_demo?: boolean;
  _demo_sections?: string[];
}
