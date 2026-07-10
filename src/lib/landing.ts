import { supabase } from "@/lib/supabase";
import type { LandingPageContent, LandingBackgroundSettings } from "@/lib/types";

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
  stat_one_label: "Selected",
  stat_one_value: "Editorials",
  stat_two_label: "Private",
  stat_two_value: "Client books",
  stat_three_label: "Fast",
  stat_three_value: "R2 delivery",
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

function normalizeBackgroundSettings(bg: any): LandingBackgroundSettings {
  const merged = { ...defaultLandingPage.background_settings, ...(bg || {}) };
  if (!["sakura", "fireflies", "snow", "autumn", "mist", "rain"].includes(merged.preset)) {
    merged.preset = "sakura";
  }
  return merged as LandingBackgroundSettings;
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
      mergedSocials.push(saved as any);
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
  } as LandingPageContent;
}

export async function getLandingPage() {
  const { data, error } = await supabase
    .from("landing_page_settings")
    .select(landingColumns)
    .eq("id", landingId)
    .maybeSingle();

  if (error || !data) return defaultLandingPage;
  return normalizeLandingPage(data as Partial<LandingPageContent>);
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
    translations: typeof input.translations === "object" && input.translations !== null ? (input.translations as Record<string, any>) : {},
    section_toggles: typeof input.section_toggles === "object" && input.section_toggles !== null ? (input.section_toggles as Record<string, boolean>) : {},
  } satisfies LandingPageContent;
}

export async function saveLandingPage(input: Record<string, unknown>) {
  const payload = landingPayloadFromInput(input);
  const { data, error } = await supabase
    .from("landing_page_settings")
    .upsert(payload, { onConflict: "id" })
    .select(landingColumns)
    .single();

  if (error) throw error;
  return normalizeLandingPage(data as Partial<LandingPageContent>);
}
