import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { HomeHero } from "@/components/HomeHero";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";
import { HomeEditorialIntro } from "@/components/landing/HomeEditorialIntro";
import { HomeAlbumWorlds } from "@/components/landing/HomeAlbumWorlds";
import { SocialLinksTree } from "@/components/landing/SocialLinksTree";
import { HomePrivateExperience } from "@/components/landing/HomePrivateExperience";
import { HomeCreativeServices } from "@/components/landing/HomeCreativeServices";
import { HomePersonalLetter } from "@/components/landing/HomePersonalLetter";
import { HomeMediaGallery } from "@/components/landing/HomeMediaGallery";
import { HomeCollaborators } from "@/components/landing/HomeCollaborators";

import { getLandingPage } from "@/lib/landing";
import { getFeaturedAlbums } from "@/lib/albums";
import { getAboutProfile } from "@/lib/about";
import { getSiteSettings } from "@/lib/site-settings";

import { cookies } from "next/headers";
import { AppLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/getDictionary";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [landing, profile, albums, settings] = await Promise.all([
    getLandingPage(),
    getAboutProfile(),
    getFeaturedAlbums(4),
    getSiteSettings(),
  ]);

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as AppLocale;
  const dict = await getDictionary(locale);

  return (
    <>
      <NatureAnimatedBackground config={landing.background_settings} />
      <main className="relative z-10 min-h-screen bg-transparent">
        <AppHeader />
      <HomeHero landing={landing} settings={settings} locale={locale} dict={dict} />
      
      {landing.section_toggles?.editorial_intro !== false && <HomeEditorialIntro landing={landing} settings={settings} />}
      {landing.section_toggles?.album_worlds !== false && <HomeAlbumWorlds albums={albums} settings={settings} />}
      {landing.section_toggles?.media_gallery !== false && <HomeMediaGallery items={landing.media_items} settings={settings} />}
      {landing.section_toggles?.social_tree !== false && <SocialLinksTree links={landing.social_links} settings={settings} />}
      {landing.section_toggles?.private_experience !== false && <HomePrivateExperience />}
      {landing.section_toggles?.creative_services !== false && <HomeCreativeServices />}
      {landing.section_toggles?.collaborators !== false && <HomeCollaborators collaborators={landing.collaborators} settings={settings} />}
      {landing.section_toggles?.personal_letter !== false && <HomePersonalLetter profile={profile} />}
      
        <AppFooter />
      </main>
    </>
  );
}
