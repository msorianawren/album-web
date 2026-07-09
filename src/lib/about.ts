import { supabase } from "@/lib/supabase";
import type { AboutProfile, EducationItem, CareerItem, HobbyItem, LanguageItem, AchievementItem, PersonalMetrics, SocialLinkItem } from "@/lib/types";

const aboutProfileId = "main";

export const defaultAboutProfile: AboutProfile = {
  id: aboutProfileId,
  display_name: "Oriana Wren",
  professional_title: "Professional Model & Creative Director",
  tagline: "Shaping visual narratives through light and emotion.",
  short_bio: "A curated portfolio space for selected albums, moving images, and private client collections.",
  full_bio: "Oriana Wren is a professional model and creative director specializing in cinematic campaigns, intimate portraits, and quiet luxury stories.",
  birthplace: "",
  location: "",
  nationality: "",
  education: [],
  career: [],
  hobbies: [],
  languages: [],
  achievements: [],
  skills: [],
  personal_metrics: {},
  personality_traits: [],
  relationship_status: "",
  quote: "Art is not what you see, but what you make others see.",
  profile_image_url: "",
  cover_image_url: "",
  gallery_media_ids: [],
  primary_cta_label: "View Portfolio",
  primary_cta_href: "/albums",
  secondary_cta_label: "Contact Me",
  secondary_cta_href: "/contact",
  social_links: [],
  is_public: true,
};

const aboutColumns = Object.keys(defaultAboutProfile).join(",");

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

function ensureMetrics(value: unknown): PersonalMetrics {
  if (typeof value === "object" && value !== null) {
    return value as PersonalMetrics;
  }
  return {};
}

export function normalizeAboutProfile(value: Partial<AboutProfile> | null | undefined): AboutProfile {
  return {
    ...defaultAboutProfile,
    ...(value ?? {}),
    id: aboutProfileId,
    education: ensureArray<EducationItem>(value?.education),
    career: ensureArray<CareerItem>(value?.career),
    hobbies: ensureArray<HobbyItem>(value?.hobbies),
    languages: ensureArray<LanguageItem>(value?.languages),
    achievements: ensureArray<AchievementItem>(value?.achievements),
    skills: ensureArray<string>(value?.skills),
    personal_metrics: ensureMetrics(value?.personal_metrics),
    personality_traits: ensureArray<string>(value?.personality_traits),
    gallery_media_ids: ensureArray<string>(value?.gallery_media_ids),
    social_links: ensureArray<SocialLinkItem>(value?.social_links),
  };
}

export async function getAboutProfile(): Promise<AboutProfile> {
  const { data, error } = await supabase
    .from("about_profile")
    .select(aboutColumns)
    .eq("id", aboutProfileId)
    .maybeSingle();

  if (error || !data) return defaultAboutProfile;
  return normalizeAboutProfile(data as Partial<AboutProfile>);
}

export function aboutPayloadFromInput(input: Record<string, unknown>): AboutProfile {
  const payload = normalizeAboutProfile(input as Partial<AboutProfile>);
  return payload;
}

export async function saveAboutProfile(input: Record<string, unknown>): Promise<AboutProfile> {
  const payload = aboutPayloadFromInput(input);
  
  const { data, error } = await supabase
    .from("about_profile")
    .upsert(payload, { onConflict: "id" })
    .select(aboutColumns)
    .single();

  if (error) throw error;
  return normalizeAboutProfile(data as Partial<AboutProfile>);
}
