import { PuzzleChallengeEditor } from "@/components/studio/PuzzleChallengeEditor";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
export default function NewPuzzleChallengePage() { return <div className="grid gap-5"><StudioPageHeader eyebrow="Puzzle Atelier" title="New Puzzle Challenge" description="Use a ready public album image or a separately processed game-only asset." /><PuzzleChallengeEditor /></div>; }
