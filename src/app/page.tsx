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
import { getAlbums } from "@/lib/albums";
import { getAboutProfile } from "@/lib/about";

import { cookies } from "next/headers";
import { AppLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/getDictionary";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [landing, profile, albums] = await Promise.all([
    getLandingPage(),
    getAboutProfile(),
    getAlbums(),
  ]);

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as AppLocale;
  const dict = await getDictionary(locale);

  return (
    <main className="relative z-10 min-h-screen bg-transparent">
      <NatureAnimatedBackground config={landing.background_settings} />
      <AppHeader />
      <HomeHero landing={landing} locale={locale} dict={dict} />
      
      <HomeEditorialIntro landing={landing} />
      <HomeAlbumWorlds albums={albums} />
      <HomeMediaGallery items={landing.media_items} />
      <SocialLinksTree links={landing.social_links} />
      <HomePrivateExperience />
      <HomeCreativeServices />
      <HomeCollaborators collaborators={landing.collaborators} />
      <HomePersonalLetter profile={profile} />
      
      <AppFooter />
    </main>
  );
}
