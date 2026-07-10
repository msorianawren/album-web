import { AppHeader } from "@/components/AppHeader";
import { getAboutProfileForDisplay } from "@/lib/about";
import { getLandingPage } from "@/lib/landing";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";
import { AboutClient } from "./AboutClient";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [profile, landing] = await Promise.all([
    getAboutProfileForDisplay({ allowDemoFallback: true }),
    getLandingPage()
  ]);

  if (!profile.is_public) {
    return (
      <main className="relative z-10 min-h-screen bg-transparent">
        <NatureAnimatedBackground config={landing.background_settings} />
        <AppHeader />
        <section className="mx-auto flex min-h-[60vh] max-w-[960px] items-center justify-center px-4 py-10">
          <p className="text-lg text-text-secondary">This profile is currently private.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <NatureAnimatedBackground config={landing.background_settings} />
      <AppHeader />
      <AboutClient profile={profile} />
    </>
  );
}
