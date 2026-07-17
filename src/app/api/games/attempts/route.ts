import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { getPuzzleChallengeForSession, startPuzzleAttempt } from "@/lib/puzzles/server";
import { puzzleAttemptStartSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await getPublicSession(request);
    if (!session.userId || session.isBlocked) return apiError("UNAUTHENTICATED", "Sign in to earn Wren Feathers.", 401);
    const parsed = puzzleAttemptStartSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return apiError("INVALID_INPUT", "Invalid puzzle attempt.", 400);
    const challenge = await getPuzzleChallengeForSession(parsed.data.challengeId, session);
    if (!challenge) return apiError("NOT_FOUND", "Puzzle challenge not found.", 404);
    const attempt = await startPuzzleAttempt({ challenge, session, mode: parsed.data.mode, gridSize: parsed.data.gridSize });
    return apiSuccess({ attempt }, { status: 201 });
  } catch (error) {
    return toServerError(error, request, "api.games.attempts.start");
  }
}
