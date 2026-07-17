import { notFound } from "next/navigation";
import { PuzzleChallengeEditor } from "@/components/studio/PuzzleChallengeEditor";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { getStudioPuzzleChallenges } from "@/lib/puzzles/server";
export default async function EditPuzzleChallengePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const challenge = (await getStudioPuzzleChallenges()).find((item) => item.id === id); if (!challenge) notFound(); return <div className="grid gap-5"><StudioPageHeader eyebrow="Puzzle Atelier" title="Edit Puzzle Challenge" description="Publishing uses a stable seed and public image sources only." /><PuzzleChallengeEditor challenge={challenge} /></div>; }
