import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { HomeHero } from "@/components/HomeHero";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";
import { HomeEditorialIntro } from "@/components/landing/HomeEditorialIntro";
import { HomeAlbumWorlds } from "@/components/landing/HomeAlbumWorlds";
import { SocialLinksTree } from "@/components/landing/SocialLinksTree";
import { HomePrivateExperience } from "@/components/landing/HomePrivateExperience";
import { HomeCreativeServices } from "@/components/landing/HomeCreativeServices";
import { HomeMediaGallery } from "@/components/landing/HomeMediaGallery";
import { HomeCollaborators } from "@/components/landing/HomeCollaborators";
import { HomePersonalLetterWrapper } from "@/components/landing/HomePersonalLetterWrapper";
import { HomeAlbumWorldsWrapper } from "@/components/landing/HomeAlbumWorldsWrapper";
import { HomeFacebookFeed } from "@/components/landing/HomeFacebookFeed";
import { Suspense } from "react";

import { getLandingPage } from "@/lib/landing";
import { getFeaturedAlbums } from "@/lib/albums";
import { getAboutProfile } from "@/lib/about";
import { getSiteSettings } from "@/lib/site-settings";
import { getLandingFacebookFeedItems } from "@/lib/facebook-feed/data";

import { cookies } from "next/headers";
import { AppLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/getDictionary";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [landing, settings] = await Promise.all([
    getLandingPage(),
    getSiteSettings(),
  ]);

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as AppLocale;
  const dict = await getDictionary(locale);
  const facebookFeedSettings = landing.facebook_feed_settings;
  const localizedFacebookFeedSettings = facebookFeedSettings && locale !== "en" ? {
    ...facebookFeedSettings,
    eyebrow: landing.translations?.[locale]?.facebook_feed_eyebrow ?? facebookFeedSettings.eyebrow,
    heading: landing.translations?.[locale]?.facebook_feed_heading ?? facebookFeedSettings.heading,
    description: landing.translations?.[locale]?.facebook_feed_description ?? facebookFeedSettings.description,
  } : facebookFeedSettings;
  const facebookFeedItems = facebookFeedSettings?.enabled
    ? await getLandingFacebookFeedItems(facebookFeedSettings.selectedItemIds)
    : [];

  return (
    <>
      <NatureAnimatedBackground config={landing.background_settings} />
      <main className="relative z-10 min-h-screen bg-transparent">
        <AppHeader />
      <HomeHero landing={landing} settings={settings} locale={locale} dict={dict} />
      {localizedFacebookFeedSettings ? <HomeFacebookFeed settings={localizedFacebookFeedSettings} items={facebookFeedItems} /> : null}
      
      {landing.section_toggles?.editorial_intro !== false && <HomeEditorialIntro landing={landing} settings={settings} />}
      {landing.section_toggles?.album_worlds !== false && (
        <Suspense fallback={<div className="h-96" />}>
          <HomeAlbumWorldsWrapper settings={settings} />
        </Suspense>
      )}
      {landing.section_toggles?.media_gallery !== false && <HomeMediaGallery items={landing.media_items} settings={settings} />}
      {landing.section_toggles?.social_tree !== false && <SocialLinksTree links={landing.social_links} settings={settings} />}
      {landing.section_toggles?.private_experience !== false && <HomePrivateExperience />}
      {landing.section_toggles?.creative_services !== false && <HomeCreativeServices />}
      {landing.section_toggles?.collaborators !== false && <HomeCollaborators collaborators={landing.collaborators} settings={settings} />}
      {landing.section_toggles?.personal_letter !== false && (
        <Suspense fallback={<div className="h-96" />}>
          <HomePersonalLetterWrapper />
        </Suspense>
      )}
      
        <AppFooter />
      </main>
    </>
  );
}
