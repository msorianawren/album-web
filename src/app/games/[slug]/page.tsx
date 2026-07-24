import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { GamePlayerShell } from "@/components/games/GamePlayerShell";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";
import { getGameCatalogEntry } from "@/games/catalog";
import { getPublicSession } from "@/lib/auth";
import { getDictionary } from "@/lib/getDictionary";
import { getLandingPage } from "@/lib/landing";
import {
  getPuzzleChallenges,
  getPuzzleResults,
  isPuzzleSchemaUnavailable,
} from "@/lib/puzzles/server";
import type { PuzzleChallenge, PuzzleResult } from "@/lib/puzzles/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = getGameCatalogEntry(slug);
  if (!game || game.status !== "published" || !game.enabled) return {};
  return {
    title: `${game.title} · Oriana Arcade Atelier`,
    description: game.description,
    alternates: { canonical: `/games/${game.slug}` },
  };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getGameCatalogEntry(slug);
  if (!game || game.status !== "published" || !game.enabled) notFound();

  const landing = await getLandingPage();
  let initialGameProps: Record<string, unknown> = {};

  if (game.slug === "puzzle-atelier") {
    const session = await getPublicSession();
    const locale = (await cookies()).get("NEXT_LOCALE")?.value ?? "en";
    const dictionary = await getDictionary(locale);
    let challenges: PuzzleChallenge[] = [];
    let results: Record<string, PuzzleResult> = {};
    let unavailable = false;
    try {
      [challenges, results] = await Promise.all([
        getPuzzleChallenges(session),
        getPuzzleResults(session.userId),
      ]);
    } catch (error) {
      if (!isPuzzleSchemaUnavailable(error)) throw error;
      unavailable = true;
    }
    initialGameProps = {
      initialChallenges: challenges,
      initialResults: results,
      signedIn: Boolean(session.userId),
      copy: dictionary.games,
      unavailable,
    };
  }

  return (
    <>
      <NatureAnimatedBackground config={landing.background_settings} />
      <main className="relative z-10 min-h-screen">
        <AppHeader />
        <GamePlayerShell game={game} initialGameProps={initialGameProps} />
        <AppFooter />
      </main>
    </>
  );
}
