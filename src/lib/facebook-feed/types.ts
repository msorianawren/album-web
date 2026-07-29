export type FacebookEmbedKind = "post" | "video" | "reel";
export type FacebookEmbedKindInput = FacebookEmbedKind | "auto";

export interface FacebookFeedItem {
  id: string;
  provider: "facebook";
  source_url: string;
  canonical_url: string;
  embed_kind: FacebookEmbedKind;
  title: string | null;
  caption: string | null;
  poster_url: string;
  poster_alt: string | null;
  published_at: string | null;
  width: number | null;
  height: number | null;
  aspect_ratio: string | null;
  is_available: boolean;
  availability_note?: string | null;
  created_at?: string;
  updated_at?: string;
}
