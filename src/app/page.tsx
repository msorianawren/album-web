import { AppHeader } from "@/components/AppHeader";
import { HomeHero } from "@/components/HomeHero";
import { getLandingPage } from "@/lib/landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  const landing = await getLandingPage();

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <HomeHero landing={landing} />
    </main>
  );
}
