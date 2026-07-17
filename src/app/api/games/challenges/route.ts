import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { apiSuccess, toServerError } from "@/lib/errors";
import { getPuzzleChallenges, getPuzzleResults } from "@/lib/puzzles/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getPublicSession(request);
    const [challenges, results] = await Promise.all([
      getPuzzleChallenges(session),
      getPuzzleResults(session.userId),
    ]);
    return apiSuccess({ challenges, results, signedIn: Boolean(session.userId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return toServerError(error, request, "api.games.challenges");
  }
}
