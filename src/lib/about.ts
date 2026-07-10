import { unstable_noStore as noStore } from "next/cache";
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
    section_toggles: typeof value?.section_toggles === 'object' ? value.section_toggles as Record<string, boolean> : {},
  };
}

export async function getAboutProfile(): Promise<AboutProfile> {
  noStore();
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
  noStore();
  const payload = aboutPayloadFromInput(input);
  
  const { data, error } = await supabase
    .from("about_profile")
    .upsert(payload, { onConflict: "id" })
    .select(aboutColumns)
    .single();

  if (error) throw error;
  return normalizeAboutProfile(data as Partial<AboutProfile>);
}

export async function getAboutProfileForDisplay(options: { allowDemoFallback?: boolean } = {}): Promise<AboutProfile> {
  const profile = await getAboutProfile();
  
  if (!options.allowDemoFallback) {
    return profile;
  }

  // We consider the profile empty or incomplete if it lacks a custom quote, bio, or cover image
  const isDemo = !profile.cover_image_url || !profile.full_bio || profile.career.length === 0;

  if (!isDemo) {
    return profile;
  }

  const demoSections: string[] = [];
  const p = { ...profile, _is_demo: true, _demo_sections: demoSections };

  if (!p.professional_title) {
    p.professional_title = "Creative Direction Placeholder";
    demoSections.push("Title");
  }
  if (!p.tagline) {
    p.tagline = "Editorial Portfolio Preview";
    demoSections.push("Tagline");
  }
  if (!p.full_bio) {
    p.full_bio = "This is an Editorial Portfolio Preview. The About Profile is currently in Demo Mode because it is not fully configured yet.\n\nCreative Direction Placeholder for visual stories. Studio Practice Placeholder. (Please configure your About Profile in Settings to replace this preview content.)";
    p.short_bio = p.full_bio;
    demoSections.push("Biography");
  }
  if (!p.quote) {
    p.quote = "Art is not what you see, but what you make others see.";
    demoSections.push("Quote");
  }
  if (p.skills.length === 0) {
    p.skills = ["Visual Storytelling Preview", "Editorial Modeling", "Creative Direction", "Art Curation", "Studio Practice Placeholder"];
    demoSections.push("Skills");
  }
  if (p.languages.length === 0) {
    p.languages = [
      { id: "demo-lang-1", language: "Language Preview", proficiency: "Native" },
      { id: "demo-lang-2", language: "Language Preview", proficiency: "Fluent" }
    ];
    demoSections.push("Languages");
  }
  if (p.career.length === 0) {
    p.career = [
      { id: "demo-car-1", role: "Career Milestone Preview", company: "Editorial Magazine Placeholder", period: "2022 - Present", description: "Creative Direction Placeholder for visual stories." },
      { id: "demo-car-2", role: "Model Placeholder", company: "Luxury Brand Preview", period: "2019 - 2022", description: "Campaign features and lookbooks preview." }
    ];
    demoSections.push("Career");
  }
  if (p.education.length === 0) {
    p.education = [
      { id: "demo-edu-1", program: "Education Placeholder", school: "University Preview", period: "2015 - 2019", description: "Focus on visual arts and storytelling preview." }
    ];
    demoSections.push("Education");
  }
  if (p.achievements.length === 0) {
    p.achievements = [
      { id: "demo-ach-1", title: "Achievement Preview", year: "2023", description: "Achievement description placeholder." }
    ];
    demoSections.push("Achievements");
  }

  return p;
}
