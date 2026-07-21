import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { PuzzleAtelier } from "@/components/games/PuzzleAtelier";
import { NatureAnimatedBackground } from "@/components/landing/NatureAnimatedBackground";
import { getPublicSession } from "@/lib/auth";
import { getDictionary } from "@/lib/getDictionary";
import { getLandingPage } from "@/lib/landing";
import { getPuzzleChallenges, getPuzzleResults, isPuzzleSchemaUnavailable } from "@/lib/puzzles/server";
import type { PuzzleChallenge, PuzzleResult } from "@/lib/puzzles/types";

export const metadata: Metadata = {
  title: "Oriana Puzzle Atelier",
  description: "Play quiet editorial sliding and swap puzzles by Oriana Wren.",
  alternates: { canonical: "/games" },
  openGraph: { title: "Oriana Puzzle Atelier", description: "Editorial sliding and swap puzzles by Oriana Wren." },
};

export default async function GamesPage() {
  const session = await getPublicSession();
  const locale = (await cookies()).get("NEXT_LOCALE")?.value ?? "en";
  const [dictionary, landing] = await Promise.all([getDictionary(locale), getLandingPage()]);
  let challenges: PuzzleChallenge[] = [];
  let results: Record<string, PuzzleResult> = {};
  let unavailable = false;
  try {
    [challenges, results] = await Promise.all([getPuzzleChallenges(session), getPuzzleResults(session.userId)]);
  } catch (error) {
    if (!isPuzzleSchemaUnavailable(error)) throw error;
    unavailable = true;
  }
  return <><NatureAnimatedBackground config={landing.background_settings} /><main className="relative z-10 min-h-screen"><AppHeader /><PuzzleAtelier initialChallenges={challenges} initialResults={results} signedIn={Boolean(session.userId)} copy={dictionary.games} unavailable={unavailable} /><AppFooter /></main></>;
}
