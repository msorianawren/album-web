import { PuzzleChallengeManager } from "@/components/studio/PuzzleChallengeManager";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getStudioPuzzleChallenges } from "@/lib/puzzles/server";

export default async function StudioGamesPage() {
  return <div className="grid gap-5"><StudioPageHeader eyebrow="Puzzle Atelier" title="Puzzle Challenges" description="Create, publish, archive, and review image puzzle challenges without touching private media." /><PuzzleChallengeManager initialChallenges={await getStudioPuzzleChallenges()} /></div>;
}
