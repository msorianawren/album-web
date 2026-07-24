import type { Metadata } from "next";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { GameHub } from "@/components/games/GameHub";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";
import { publishedGameCatalog } from "@/games/catalog";
import { getLandingPage } from "@/lib/landing";

export const metadata: Metadata = {
  title: "Oriana Arcade Atelier",
  description: "Play original quiet-luxury games from Oriana Wren.",
  alternates: { canonical: "/games" },
  openGraph: { title: "Oriana Arcade Atelier", description: "Original editorial games by Oriana Wren." },
};

export default async function GamesPage() {
  const landing = await getLandingPage();
  return (
    <>
      <NatureAnimatedBackground config={landing.background_settings} />
      <main className="relative z-10 min-h-screen">
        <AppHeader />
        <GameHub games={publishedGameCatalog} />
        <AppFooter />
      </main>
    </>
  );
}
