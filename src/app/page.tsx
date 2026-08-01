import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { HomeHero } from "@/components/HomeHero";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";
import { HomeEditorialIntro } from "@/components/landing/HomeEditorialIntro";
import { SocialLinksTree } from "@/components/landing/SocialLinksTree";
import { HomePrivateExperience } from "@/components/landing/HomePrivateExperience";
import { HomeCreativeServices } from "@/components/landing/HomeCreativeServices";
import { HomeMediaGallery } from "@/components/landing/HomeMediaGallery";
import { HomeCollaborators } from "@/components/landing/HomeCollaborators";
import { HomePersonalLetterWrapper } from "@/components/landing/HomePersonalLetterWrapper";
import { HomeAlbumWorlds } from "@/components/landing/HomeAlbumWorlds";

import { Suspense } from "react";

import { HomeAdminStories } from "@/components/landing/HomeAdminStories";
import { getLandingAdminStories } from "@/lib/admin-stories/data";

import { getLandingPage } from "@/lib/landing";
import { getFeaturedAlbums } from "@/lib/albums";
import { getSiteSettings } from "@/lib/site-settings";

import { cookies } from "next/headers";
import { AppLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/getDictionary";
import "@/components/landing/landing-home.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [landing, featuredAlbums, settings] = await Promise.all([
    getLandingPage(),
    getFeaturedAlbums(4),
    getSiteSettings(),
  ]);

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as AppLocale;
  const dict = await getDictionary(locale);
  const adminStoriesSettings = landing.admin_stories_settings;
  const localizedAdminStoriesSettings = adminStoriesSettings && locale !== "en" ? {
    ...adminStoriesSettings,
    eyebrow: landing.translations?.[locale]?.admin_stories_eyebrow ?? adminStoriesSettings.eyebrow,
    heading: landing.translations?.[locale]?.admin_stories_heading ?? adminStoriesSettings.heading,
  } : adminStoriesSettings;
  const adminStories = adminStoriesSettings?.enabled
    ? await getLandingAdminStories()
    : [];

  return (
    <>
      <NatureAnimatedBackground config={landing.background_settings} />
      <main className="landing-home relative z-10 min-h-screen bg-transparent">
        <AppHeader />
        <HomeHero landing={landing} settings={settings} locale={locale} dict={dict} />
        {landing.section_toggles?.editorial_intro !== false ? <HomeEditorialIntro landing={landing} /> : null}
        {landing.section_toggles?.album_worlds !== false ? <HomeAlbumWorlds albums={featuredAlbums} /> : null}
        {localizedAdminStoriesSettings?.enabled ? <HomeAdminStories settings={localizedAdminStoriesSettings} items={adminStories} /> : null}
        {landing.section_toggles?.media_gallery !== false ? <HomeMediaGallery items={landing.media_items} /> : null}
        {landing.section_toggles?.private_experience !== false ? <HomePrivateExperience albums={featuredAlbums} /> : null}
        {landing.section_toggles?.creative_services !== false ? <HomeCreativeServices /> : null}
        {landing.section_toggles?.collaborators !== false ? <HomeCollaborators collaborators={landing.collaborators} /> : null}
        {landing.section_toggles?.social_tree !== false ? <SocialLinksTree links={landing.social_links} settings={settings} /> : null}
        {landing.section_toggles?.personal_letter !== false ? (
          <Suspense fallback={null}><HomePersonalLetterWrapper /></Suspense>
        ) : null}
      
        <AppFooter />
      </main>
    </>
  );
}
