import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicServerClient } from "@/lib/db/public";
import type { LandingPageContent, LandingBackgroundSettings, LandingMetaFeedSettings, LandingSocialLink, TranslationMap } from "@/lib/types";
import { albumDemoFixturesEnabled } from "@/lib/demo-fixtures";

const landingId = "home";

export const defaultLandingPage: LandingPageContent = {
  id: landingId,
  eyebrow: "Oriana Wren",
  headline: "Editorial presence, shaped in light.",
  subheadline: "Professional model for cinematic campaigns, intimate portraits, and quiet luxury stories.",
  body:
    "A curated portfolio space for selected albums, moving images, and private client collections.",
  primary_cta_label: "View portfolio",
  primary_cta_href: "/albums",
  secondary_cta_label: "About Oriana",
  secondary_cta_href: "/about",
  hero_image_url:
    "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=1400&q=88",
  portrait_image_url:
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=88",
  gallery_image_url:
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=88",
  feature_title: "A private archive with a public face.",
  feature_body:
    "Albums can be public, updating, or privately held while the landing page stays polished for visitors.",
  stat_one_label: "Selected public albums",
  stat_one_value: "Curated",
  stat_two_label: "Private access by request",
  stat_two_value: "Protected",
  stat_three_label: "Fast photo browsing",
  stat_three_value: "Smooth",
  social_links: [
    { id: "1", platform: "Instagram", url: "", label: "", enabled: true, order: 1 },
    { id: "2", platform: "Facebook", url: "", label: "", enabled: true, order: 2 },
    { id: "3", platform: "Threads", url: "", label: "", enabled: true, order: 3 },
    { id: "4", platform: "TikTok", url: "", label: "", enabled: true, order: 4 },
    { id: "5", platform: "Telegram", url: "", label: "", enabled: true, order: 5 },
  ],
  media_items: [
    { id: "m1", type: "image", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", enabled: true, order: 1, title: "", caption: "", alt: "", poster_url: "" },
    { id: "m2", type: "image", url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80", enabled: true, order: 2, title: "", caption: "", alt: "", poster_url: "" },
    { id: "m3", type: "image", url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80", enabled: true, order: 3, title: "", caption: "", alt: "", poster_url: "" },
  ],
  collaborators: [
    { id: "c1", name: "Creative Director", role: "Direction", portrait_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80", enabled: true, order: 1, bio: "", portfolio_url: "" },
    { id: "c2", name: "Editorial Photographer", role: "Photography", portrait_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80", enabled: true, order: 2, bio: "", portfolio_url: "" },
    { id: "c3", name: "Beauty Artist", role: "Makeup", portrait_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80", enabled: true, order: 3, bio: "", portfolio_url: "" },
  ],
  background_settings: {
    enabled: true,
    preset: "sakura",
    intensity: 100,
    opacity: 100,
    speed: 50,
    density: 50,
    blur: 0,
    accent_color_1: null,
    accent_color_2: null,
    custom_url: null,
    apply_to_all_public_pages: true,
  },
  translations: {},
  section_toggles: {},
  meta_feed_settings: {
    enabled: false,
    eyebrow: "Recent Motion",
    heading: "Stories in motion",
    description: "A selection of recent moving images and behind-the-scenes moments.",
    selectedItemIds: [],
    featuredItemId: null,
    layout: "editorial",
    playMode: "inline",
    showCaption: true,
    showPublishedDate: true,
    showFacebookBranding: true,
    autoFillLatest: false,
    maxItems: 4,
    itemOverrides: {},
  },
};

const landingColumns = Object.keys(defaultLandingPage).join(",");

function cleanText(value: unknown, fallback: string, maxLength = 240) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function cleanUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://")
  ) {
    return trimmed.slice(0, 1000);
  }
  return fallback;
}

function normalizeBackgroundSettings(bg: unknown): LandingBackgroundSettings {
  const saved = typeof bg === "object" && bg !== null ? (bg as Partial<LandingBackgroundSettings>) : {};
  const merged = { ...defaultLandingPage.background_settings, ...saved };
  if (!["sakura", "fireflies", "snow", "autumn", "mist", "rain"].includes(merged.preset)) {
    merged.preset = "sakura";
  }
  return merged as LandingBackgroundSettings;
}

function normalizeTranslations(value: unknown): TranslationMap {
  if (typeof value !== "object" || value === null) return {};
  const output: TranslationMap = {};
  for (const [locale, fields] of Object.entries(value)) {
    if (typeof fields !== "object" || fields === null) continue;
    const cleanedFields: Partial<Record<string, string>> = {};
    for (const [key, text] of Object.entries(fields)) {
      if (typeof text === "string") cleanedFields[key] = text;
    }
    output[locale] = cleanedFields;
  }
  return output;
}

export function normalizeMetaFeedSettings(value: unknown): LandingMetaFeedSettings {
  const saved = typeof value === "object" && value !== null ? value as Partial<LandingMetaFeedSettings> : {};
  const defaults = defaultLandingPage.meta_feed_settings!;
  const selectedItemIds = Array.isArray(saved.selectedItemIds)
    ? [...new Set(saved.selectedItemIds.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 6)
    : [];
  const featuredItemId = typeof saved.featuredItemId === "string" && selectedItemIds.includes(saved.featuredItemId) ? saved.featuredItemId : null;
  const itemOverrides = typeof saved.itemOverrides === "object" && saved.itemOverrides !== null
    ? Object.fromEntries(Object.entries(saved.itemOverrides).flatMap(([id, item]) => {
        if (!selectedItemIds.includes(id) || typeof item !== "object" || item === null) return [];
        const source = item as { title?: unknown; caption?: unknown; enabled?: unknown };
        return [[id, {
          ...(typeof source.title === "string" ? { title: source.title.trim().slice(0, 180) } : {}),
          ...(typeof source.caption === "string" ? { caption: source.caption.trim().slice(0, 600) } : {}),
          ...(typeof source.enabled === "boolean" ? { enabled: source.enabled } : {}),
        }]];
      }))
    : {};
  return {
    ...defaults,
    enabled: Boolean(saved.enabled),
    eyebrow: cleanText(saved.eyebrow, defaults.eyebrow, 80),
    heading: cleanText(saved.heading, defaults.heading, 140),
    description: cleanText(saved.description, defaults.description, 500),
    selectedItemIds,
    featuredItemId,
    layout: saved.layout === "filmstrip" || saved.layout === "carousel" ? saved.layout : "editorial",
    playMode: saved.playMode === "facebook" ? "facebook" : "inline",
    showCaption: saved.showCaption !== false,
    showPublishedDate: saved.showPublishedDate !== false,
    showFacebookBranding: saved.showFacebookBranding !== false,
    autoFillLatest: Boolean(saved.autoFillLatest),
    maxItems: Math.min(6, Math.max(1, typeof saved.maxItems === "number" && Number.isInteger(saved.maxItems) ? saved.maxItems : defaults.maxItems)),
    itemOverrides,
  };
}

export function normalizeLandingPage(value: Partial<LandingPageContent> | null | undefined) {
  const defaultSocials = [...defaultLandingPage.social_links];
  const savedSocials = Array.isArray(value?.social_links) ? value?.social_links : [];
  
  const mergedSocials = [...defaultSocials];
  for (const saved of savedSocials) {
    const index = mergedSocials.findIndex(d => d.platform === saved.platform);
    if (index >= 0) {
      mergedSocials[index] = { ...mergedSocials[index], ...saved };
    } else {
      mergedSocials.push(saved as LandingSocialLink);
    }
  }

  return {
    ...defaultLandingPage,
    ...(value ?? {}),
    id: landingId,
    social_links: mergedSocials,
    media_items: Array.isArray(value?.media_items) ? value?.media_items : defaultLandingPage.media_items,
    collaborators: Array.isArray(value?.collaborators) ? value?.collaborators : defaultLandingPage.collaborators,
    background_settings: normalizeBackgroundSettings(value?.background_settings),
    section_toggles: typeof value?.section_toggles === 'object' && value.section_toggles !== null ? value.section_toggles : {},
    meta_feed_settings: normalizeMetaFeedSettings(value?.meta_feed_settings),
  } as LandingPageContent;
}

const getCachedLandingPage = unstable_cache(async () => {
  const { data, error } = await createPublicServerClient()
    .from("landing_page_settings")
    .select(landingColumns)
    .eq("id", landingId)
    .maybeSingle();

  if (error || !data) return defaultLandingPage;
  return normalizeLandingPage(data as Partial<LandingPageContent>);
}, ["landing-page"], { tags: ["landing-page"], revalidate: 3600 });

export function getLandingPage() {
  if (albumDemoFixturesEnabled()) {
    return Promise.resolve(defaultLandingPage);
  }
  return getCachedLandingPage();
}

export function landingPayloadFromInput(input: Record<string, unknown>) {
  return {
    id: landingId,
    eyebrow: cleanText(input.eyebrow, defaultLandingPage.eyebrow, 80),
    headline: cleanText(input.headline, defaultLandingPage.headline, 140),
    subheadline: cleanText(input.subheadline, defaultLandingPage.subheadline, 220),
    body: cleanText(input.body, defaultLandingPage.body, 500),
    primary_cta_label: cleanText(input.primary_cta_label, defaultLandingPage.primary_cta_label, 40),
    primary_cta_href: cleanUrl(input.primary_cta_href, defaultLandingPage.primary_cta_href),
    secondary_cta_label: cleanText(
      input.secondary_cta_label,
      defaultLandingPage.secondary_cta_label,
      40,
    ),
    secondary_cta_href: cleanUrl(input.secondary_cta_href, defaultLandingPage.secondary_cta_href),
    hero_image_url: cleanUrl(input.hero_image_url, defaultLandingPage.hero_image_url),
    portrait_image_url: cleanUrl(input.portrait_image_url, defaultLandingPage.portrait_image_url),
    gallery_image_url: cleanUrl(input.gallery_image_url, defaultLandingPage.gallery_image_url),
    feature_title: cleanText(input.feature_title, defaultLandingPage.feature_title, 140),
    feature_body: cleanText(input.feature_body, defaultLandingPage.feature_body, 420),
    stat_one_label: cleanText(input.stat_one_label, defaultLandingPage.stat_one_label, 40),
    stat_one_value: cleanText(input.stat_one_value, defaultLandingPage.stat_one_value, 40),
    stat_two_label: cleanText(input.stat_two_label, defaultLandingPage.stat_two_label, 40),
    stat_two_value: cleanText(input.stat_two_value, defaultLandingPage.stat_two_value, 40),
    stat_three_label: cleanText(input.stat_three_label, defaultLandingPage.stat_three_label, 40),
    stat_three_value: cleanText(input.stat_three_value, defaultLandingPage.stat_three_value, 40),
    social_links: Array.isArray(input.social_links) ? input.social_links : defaultLandingPage.social_links,
    media_items: Array.isArray(input.media_items) ? input.media_items : defaultLandingPage.media_items,
    collaborators: Array.isArray(input.collaborators) ? input.collaborators : defaultLandingPage.collaborators,
    background_settings: typeof input.background_settings === "object" && input.background_settings !== null 
      ? normalizeBackgroundSettings(input.background_settings)
      : defaultLandingPage.background_settings,
    translations: normalizeTranslations(input.translations),
    section_toggles: typeof input.section_toggles === "object" && input.section_toggles !== null ? (input.section_toggles as Record<string, boolean>) : {},
    meta_feed_settings: normalizeMetaFeedSettings(input.meta_feed_settings),
  } satisfies LandingPageContent;
}

export async function saveLandingPage(client: SupabaseClient, input: Record<string, unknown>) {
  const payload = landingPayloadFromInput(input);
  const { data, error } = await client
    .from("landing_page_settings")
    .upsert(payload, { onConflict: "id" })
    .select(landingColumns)
    .single();

  if (error) throw error;
  return normalizeLandingPage(data as Partial<LandingPageContent>);
}
