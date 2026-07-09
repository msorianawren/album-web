import { AppHeader } from "@/components/AppHeader";
import { HomeHero } from "@/components/HomeHero";
import { getLandingPage } from "@/lib/landing";

import { cookies } from "next/headers";
import { AppLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/getDictionary";

export const dynamic = "force-dynamic";

export default async function Home() {
  const landing = await getLandingPage();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value || "en") as AppLocale;
  const dict = await getDictionary(locale);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <HomeHero landing={landing} locale={locale} dict={dict} />
    </main>
  );
}
