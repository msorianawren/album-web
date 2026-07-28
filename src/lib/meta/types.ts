export type MetaConnectionStatus = "connected" | "disconnected" | "expired" | "needs_attention";
export type MetaFeedItemType = "video" | "reel" | "live_replay" | "video_post";

export interface MetaPageOption {
  id: string;
  name: string;
  pictureUrl: string | null;
}

export interface MetaFeedItem {
  id: string;
  connection_id: string;
  provider_item_id: string;
  post_id: string | null;
  video_id: string | null;
  item_type: MetaFeedItemType;
  message: string | null;
  title: string | null;
  permalink_url: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  published_at: string | null;
  is_public: boolean;
  is_available: boolean;
}

export interface MetaPageConnectionSummary {
  id: string;
  provider: "facebook";
  page_id: string;
  page_name: string;
  page_picture_url: string | null;
  token_expires_at: string | null;
  granted_scopes: string[];
  connected_by: string | null;
  connection_status: MetaConnectionStatus;
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaConnectionStatusPayload {
  configured: boolean;
  connection: MetaPageConnectionSummary | null;
  pendingPageSelection: boolean;
  pages: MetaPageOption[];
  feedCount: number;
}

export interface NormalizedMetaFeedItem {
  providerItemId: string;
  postId: string | null;
  videoId: string | null;
  itemType: MetaFeedItemType;
  message: string | null;
  title: string | null;
  permalinkUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  isPublic: boolean;
  rawMetadata: Record<string, unknown>;
}
