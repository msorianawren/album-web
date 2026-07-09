import { supabase } from "@/lib/supabase";
import type { LandingPageContent } from "@/lib/types";

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
  translations: {},
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

export function normalizeLandingPage(value: Partial<LandingPageContent> | null | undefined) {
  return {
    ...defaultLandingPage,
    ...(value ?? {}),
    id: landingId,
  } satisfies LandingPageContent;
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
    translations: typeof input.translations === "object" && input.translations !== null ? input.translations : {},
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
