import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { createTrustedServiceRoleClient } from "@/lib/db/trusted-service";
import { verifyMemoryGarden } from "@/games/engines/memory-garden/verifier";
import type { GameDifficulty, GameReplayTrace } from "@/games/core/types";
import { z } from "zod";

const completeSchema = z.object({
  nonce: z.string(),
  replay: z.object({
    formatVersion: z.literal(1),
    engineVersion: z.string(),
    seed: z.string(),
    fixedStepMs: z.number(),
    actions: z.array(z.any()),
  }),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getPublicSession(request);
    if (!session.userId || session.isBlocked) {
      return apiError("UNAUTHENTICATED", "Sign in to earn Wren Feathers.", 401);
    }

    const { id: sessionId } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid completion request.", 400);
    }

    const { nonce, replay } = parsed.data;

    const admin = createTrustedServiceRoleClient();
    
    // Validate session
    const { data: gameSession } = await admin
      .from("game_sessions")
      .select("id, user_id, game_id, game_version_id, difficulty_id, status, nonce_hash")
      .eq("id", sessionId)
      .eq("user_id", session.userId)
      .single();

    if (!gameSession) {
      return apiError("NOT_FOUND", "Game session not found.", 404);
    }

    if (gameSession.status !== "started" && gameSession.status !== "finalized") {
      return apiError("CONFLICT", "Game session is no longer active.", 400);
    }

    const { data: game } = await admin
      .from("games")
      .select("slug")
      .eq("id", gameSession.game_id)
      .single();

    if (!["memory-garden", "snake", "feather-merge", "quiet-meadow", "echo-chimes", "wren-flight", "zen-cairn"].includes(game?.slug)) {
      return apiError("FORBIDDEN", "Rewards are not enabled for this game.", 403);
    }

    const { data: version } = await admin
      .from("game_versions")
      .select("id, status, config, engine_version, version, schema_version, content_digest, game_id")
      .eq("id", gameSession.game_version_id)
      .single();

    if (!version || version.status !== "published") {
      return apiError("NOT_FOUND", "Published game version not found.", 404);
    }

    const { data: difficulty } = await admin
      .from("game_difficulties")
      .select("id, active, config")
      .eq("id", gameSession.difficulty_id)
      .single();

    if (!difficulty || !difficulty.active) {
      return apiError("NOT_FOUND", "Active game difficulty not found.", 404);
    }

    // Verify replay Trace
    const publishedVersion = {
      id: version.id,
      gameId: version.game_id,
      version: version.version,
      schemaVersion: version.schema_version,
      engineVersion: version.engine_version,
      contentDigest: version.content_digest,
      config: version.config as Record<string, unknown>,
    };

    let verification;
    if (game?.slug === "memory-garden") {
      verification = verifyMemoryGarden(publishedVersion, difficulty as GameDifficulty, replay as GameReplayTrace);
    } else if (game?.slug === "snake") {
      const { verifySnake } = await import("@/games/engines/snake/verifier");
      verification = verifySnake(publishedVersion, difficulty as GameDifficulty, replay as GameReplayTrace);
    } else if (game?.slug === "feather-merge") {
      const { verifyFeatherMerge } = await import("@/games/engines/feather-merge/verifier");
      verification = verifyFeatherMerge(publishedVersion, difficulty as GameDifficulty, replay as GameReplayTrace);
    } else if (game?.slug === "quiet-meadow") {
      const { verifyQuietMeadow } = await import("@/games/engines/quiet-meadow/verifier");
      verification = verifyQuietMeadow(publishedVersion, difficulty as GameDifficulty, replay as GameReplayTrace);
    } else if (game?.slug === "echo-chimes") {
      const { verifyEchoChimes } = await import("@/games/engines/echo-chimes/verifier");
      verification = verifyEchoChimes(publishedVersion, difficulty as GameDifficulty, replay as GameReplayTrace);
    } else if (game?.slug === "wren-flight") {
      const { verifyWrenFlight } = await import("@/games/engines/wren-flight/verifier");
      verification = verifyWrenFlight(publishedVersion, difficulty as GameDifficulty, replay as GameReplayTrace);
    } else if (game?.slug === "zen-cairn") {
      const { verifyZenCairn } = await import("@/games/engines/zen-cairn/verifier");
      verification = verifyZenCairn(publishedVersion, difficulty as GameDifficulty, replay as GameReplayTrace);
    } else {
      return apiError("SERVER_ERROR", "Verifier not registered.", 500);
    }
    
    if (!verification.valid) {
      return apiError("INVALID_INPUT", verification.reason || "Replay verification failed.", 400);
    }

    // RPC Finalize
    const { data: result, error } = await admin.rpc("finalize_game_session_v1", {
      p_session_id: sessionId,
      p_user_id: session.userId,
      p_nonce: nonce,
      p_replay: replay,
      p_replay_digest: verification.replayDigest,
      p_duration_ticks: verification.durationTicks,
      p_score: verification.score,
      p_verification: verification,
    });

    if (error || !result || !result.length) {
      throw error || new Error("Failed to finalize game session.");
    }

    const finalResult = result[0];

    return apiSuccess({
      resultId: finalResult.result_id,
      rewardGranted: finalResult.reward_granted,
      balanceAfter: finalResult.balance_after,
      duplicate: finalResult.duplicate,
    }, { status: 200 });
  } catch (error) {
    return toServerError(error, request, "api.games.sessions.complete");
  }
}
