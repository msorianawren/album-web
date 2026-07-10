import "server-only";
import { z } from "zod";
import { albumStatuses } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import type { SiteSettings } from "@/lib/types";

export const defaultSiteSettings: SiteSettings = {
  id: "default",
  site_name: "Oriana Wren",
  site_description: "A private photo and video album platform.",
  site_logo_url: null,
  site_logo_alt: "Website logo",
  site_favicon_url: null,
  contact_email: null,
  default_album_status: "private",
  allow_public_comments: true,
  allow_public_likes: true,
  allow_public_downloads: true,
  require_comment_name: false,
  maintenance_mode: false,
  maintenance_message: null,
  default_theme: "dark",
  homepage_layout: "featured",
  homepage_hero_preset: "cinematic",
  social_tree_style: "botanical",
  collaborator_mode: "portraits",
  homepage_gallery_mode: "editorial_grid",
  album_card_density: "comfortable",
  album_list_layout: "editorial",
  album_viewer_style: "clean",
  show_counts_on_cards: true,
  show_updated_date: true,
  show_status_badges: true,
  default_sort_order: "newest",
  albums_per_page: 24,
  media_per_page: 60,
  enable_video_uploads: true,
  enable_image_uploads: true,
  max_image_size_mb: 30,
  max_video_size_mb: 500,
  max_upload_files_per_batch: 20,
  max_album_storage_mb: 5000,
  max_image_pixels: 36_000_000,
  max_video_duration_seconds: 600,
  max_video_resolution_pixels: 8_294_400,
  auto_set_first_image_as_cover: true,
  show_video_posters: true,
  use_thumbnails_in_grid: true,
  max_comment_length: 1000,
  comment_rate_limit_count: 6,
  comment_rate_limit_window_seconds: 300,
  like_rate_limit_count: 40,
  like_rate_limit_window_seconds: 300,
  upload_rate_limit_count: 30,
  upload_rate_limit_window_seconds: 900,
  download_rate_limit_count: 60,
  download_rate_limit_window_seconds: 300,
  admin_mutation_rate_limit_count: 120,
  admin_mutation_rate_limit_window_seconds: 300,
  block_duplicate_comments: true,
  block_comment_links: true,
  moderate_suspicious_comments: true,
  strip_image_metadata: true,
  store_private_originals: false,
  allow_original_downloads: false,
  enable_media_watermark: false,
  watermark_text: null,
  disable_public_right_click: false,
  enable_soft_delete: true,
  soft_delete_retention_days: 30,
  enable_likes: true,
  seo_title: null,
  seo_description: null,
  og_image_url: null,
  twitter_card: "summary_large_image",
  footer_description: "Oriana Wren is a private editorial album space for cinematic portraits, travel diaries, Vietnamese elegance, fashion stories, and selected visual collections.",
  footer_note: "Some albums are public, some are still being updated, and selected collections remain private by request.",
  advanced_settings: {
    enable_album_memory: true,
    album_memory_retention_days: 180,
    show_recently_viewed_badge: true,
    show_already_viewed_badge: true,
    show_continue_viewing_hint: true,
    show_local_privacy_note: true,
  },
};

export const siteSettingsSchema = z.object({
  site_name: z.string().trim().min(1).max(120),
  site_description: z.string().trim().max(500),
  site_logo_url: z.string().trim().url().optional().nullable().or(z.literal("")),
  site_logo_alt: z.string().trim().max(120).optional().nullable(),
  site_favicon_url: z.string().trim().url().optional().nullable().or(z.literal("")),
  contact_email: z.string().trim().email().optional().nullable().or(z.literal("")),
  default_album_status: z.enum(albumStatuses),
  allow_public_comments: z.boolean(),
  allow_public_likes: z.boolean(),
  allow_public_downloads: z.boolean(),
  require_comment_name: z.boolean(),
  maintenance_mode: z.boolean(),
  maintenance_message: z.string().trim().max(500).optional().nullable(),
  default_theme: z.enum(["dark", "light", "system"]),
  homepage_layout: z.enum(["featured", "grid", "minimal"]),
  homepage_hero_preset: z.string().trim().max(120).default("cinematic"),
  social_tree_style: z.string().trim().max(120).default("botanical"),
  collaborator_mode: z.string().trim().max(120).default("portraits"),
  homepage_gallery_mode: z.string().trim().max(120).default("editorial_grid"),
  album_card_density: z.enum(["comfortable", "compact"]),
  album_list_layout: z.string().trim().max(120).default("editorial"),
  album_viewer_style: z.string().trim().max(120).default("clean"),
  show_counts_on_cards: z.boolean(),
  show_updated_date: z.boolean(),
  show_status_badges: z.boolean(),
  default_sort_order: z.enum(["newest", "oldest", "title"]),
  albums_per_page: z.number().int().min(6).max(100),
  media_per_page: z.number().int().min(12).max(200),
  enable_video_uploads: z.boolean(),
  enable_image_uploads: z.boolean(),
  max_image_size_mb: z.number().int().min(1).max(100),
  max_video_size_mb: z.number().int().min(10).max(2000),
  max_upload_files_per_batch: z.number().int().min(1).max(100),
  max_album_storage_mb: z.number().int().min(100).max(100000),
  max_image_pixels: z.number().int().min(1_000_000).max(100_000_000),
  max_video_duration_seconds: z.number().int().min(1).max(24 * 60 * 60),
  max_video_resolution_pixels: z.number().int().min(1_000_000).max(100_000_000),
  auto_set_first_image_as_cover: z.boolean(),
  show_video_posters: z.boolean(),
  use_thumbnails_in_grid: z.boolean(),
  max_comment_length: z.number().int().min(100).max(2000),
  comment_rate_limit_count: z.number().int().min(1).max(200),
  comment_rate_limit_window_seconds: z.number().int().min(10).max(86400),
  like_rate_limit_count: z.number().int().min(1).max(1000),
  like_rate_limit_window_seconds: z.number().int().min(10).max(86400),
  upload_rate_limit_count: z.number().int().min(1).max(500),
  upload_rate_limit_window_seconds: z.number().int().min(10).max(86400),
  download_rate_limit_count: z.number().int().min(1).max(2000),
  download_rate_limit_window_seconds: z.number().int().min(10).max(86400),
  admin_mutation_rate_limit_count: z.number().int().min(1).max(2000),
  admin_mutation_rate_limit_window_seconds: z.number().int().min(10).max(86400),
  block_duplicate_comments: z.boolean(),
  block_comment_links: z.boolean(),
  moderate_suspicious_comments: z.boolean(),
  strip_image_metadata: z.boolean(),
  store_private_originals: z.boolean(),
  allow_original_downloads: z.boolean(),
  enable_media_watermark: z.boolean(),
  watermark_text: z.string().trim().max(80).optional().nullable(),
  disable_public_right_click: z.boolean(),
  enable_soft_delete: z.boolean(),
  soft_delete_retention_days: z.number().int().min(1).max(365),
  enable_likes: z.boolean(),
  seo_title: z.string().trim().max(120).optional().nullable(),
  seo_description: z.string().trim().max(300).optional().nullable(),
  og_image_url: z.string().trim().url().optional().nullable().or(z.literal("")),
  twitter_card: z.enum(["summary", "summary_large_image"]),
  footer_description: z.string().trim().max(500),
  footer_note: z.string().trim().max(300),
  advanced_settings: z.record(z.any()).optional().nullable(),
});

function normalizeNullableUrl(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : null;
}

export function normalizeSiteSettings(value: Partial<SiteSettings> | null | undefined): SiteSettings {
  return {
    ...defaultSiteSettings,
    ...(value ?? {}),
    id: "default",
  };
}

export async function getSiteSettings() {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) return defaultSiteSettings;
  return normalizeSiteSettings(data as Partial<SiteSettings>);
}

export async function saveSiteSettings(input: unknown) {
  const parsed = siteSettingsSchema.parse(input);
  const payload = {
    ...parsed,
    id: "default",
    site_logo_url: normalizeNullableUrl(parsed.site_logo_url),
    site_logo_alt: parsed.site_logo_alt?.trim() || "Website logo",
    site_favicon_url: normalizeNullableUrl(parsed.site_favicon_url),
    contact_email: parsed.contact_email && parsed.contact_email.trim() ? parsed.contact_email.trim() : null,
    maintenance_message: parsed.maintenance_message?.trim() || null,
    seo_title: parsed.seo_title?.trim() || null,
    seo_description: parsed.seo_description?.trim() || null,
    og_image_url: normalizeNullableUrl(parsed.og_image_url),
    watermark_text: parsed.watermark_text?.trim() || null,
    footer_description: parsed.footer_description.trim() || defaultSiteSettings.footer_description,
    footer_note: parsed.footer_note.trim() || defaultSiteSettings.footer_note,
    advanced_settings: typeof parsed.advanced_settings === "object" && parsed.advanced_settings !== null ? parsed.advanced_settings : defaultSiteSettings.advanced_settings,
  };

  const { data, error } = await supabase
    .from("site_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeSiteSettings(data as Partial<SiteSettings>);
}
