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
  album_card_density: "comfortable",
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
  auto_set_first_image_as_cover: true,
  show_video_posters: true,
  use_thumbnails_in_grid: true,
  max_comment_length: 1000,
  enable_likes: true,
  seo_title: null,
  seo_description: null,
  og_image_url: null,
  twitter_card: "summary_large_image",
};

export const siteSettingsSchema = z.object({
  site_name: z.string().trim().min(1).max(120),
  site_description: z.string().trim().max(500),
  site_logo_url: z.string().trim().url().optional().nullable().or(z.literal("")),
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
  album_card_density: z.enum(["comfortable", "compact"]),
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
  auto_set_first_image_as_cover: z.boolean(),
  show_video_posters: z.boolean(),
  use_thumbnails_in_grid: z.boolean(),
  max_comment_length: z.number().int().min(100).max(2000),
  enable_likes: z.boolean(),
  seo_title: z.string().trim().max(120).optional().nullable(),
  seo_description: z.string().trim().max(300).optional().nullable(),
  og_image_url: z.string().trim().url().optional().nullable().or(z.literal("")),
  twitter_card: z.enum(["summary", "summary_large_image"]),
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
    contact_email: parsed.contact_email && parsed.contact_email.trim() ? parsed.contact_email.trim() : null,
    maintenance_message: parsed.maintenance_message?.trim() || null,
    seo_title: parsed.seo_title?.trim() || null,
    seo_description: parsed.seo_description?.trim() || null,
    og_image_url: normalizeNullableUrl(parsed.og_image_url),
  };

  const { data, error } = await supabase
    .from("site_settings")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeSiteSettings(data as Partial<SiteSettings>);
}
