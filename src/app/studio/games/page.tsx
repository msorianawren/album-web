import { GamePlatformCatalog } from "@/components/studio/GamePlatformCatalog";
import { PuzzleChallengeManager } from "@/components/studio/PuzzleChallengeManager";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { gameCatalog } from "@/games/catalog";
import { getStudioPuzzleChallenges } from "@/lib/puzzles/server";

export default async function StudioGamesPage() {
  return (
    <div className="grid gap-8">
      <StudioPageHeader
        eyebrow="Arcade Atelier"
        title="Game Studio"
        description="Review the public game catalog, immutable versions, practice status, and legacy Puzzle Atelier challenges."
      />
      <GamePlatformCatalog games={gameCatalog} />
      <div className="border-t border-border pt-8">
        <StudioPageHeader
          eyebrow="Legacy content"
          title="Puzzle Challenges"
          description="Create, publish, archive, and review image puzzle challenges without touching private media."
        />
        <div className="mt-5">
          <PuzzleChallengeManager initialChallenges={await getStudioPuzzleChallenges()} />
        </div>
      </div>
    </div>
  );
}
