import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { finalizePuzzleAttempt } from "@/lib/puzzles/server";
import { puzzleAttemptCompleteSchema } from "@/lib/validators";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getPublicSession(request);
    if (!session.userId || session.isBlocked) return apiError("UNAUTHENTICATED", "Sign in to earn Wren Feathers.", 401);
    const { id } = await params;
    const parsed = puzzleAttemptCompleteSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success || parsed.data.attemptId !== id) return apiError("INVALID_INPUT", "Invalid puzzle completion.", 400);
    const completion = await finalizePuzzleAttempt({
      attemptId: id,
      session,
      elapsedMs: parsed.data.elapsedMs,
      trace: parsed.data.trace,
    });
    return apiSuccess({ completion });
  } catch (error) {
    return toServerError(error, request, "api.games.attempts.complete");
  }
}
