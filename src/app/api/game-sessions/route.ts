import { NextRequest } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { createTrustedServiceRoleClient } from "@/lib/db/trusted-service";
import crypto from "node:crypto";
import { z } from "zod";

const startSchema = z.object({
  gameSlug: z.string(),
  difficultyKey: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getPublicSession(request);
    if (!session.userId || session.isBlocked) {
      return apiError("UNAUTHENTICATED", "Sign in to earn Wren Feathers.", 401);
    }

    const body = await request.json().catch(() => ({}));
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid game session request.", 400);
    }

    const { gameSlug, difficultyKey } = parsed.data;

    if (!["memory-garden", "snake", "feather-merge", "quiet-meadow", "echo-chimes", "wren-flight", "zen-cairn"].includes(gameSlug)) {
      return apiError("FORBIDDEN", "Rewards are not enabled for this game.", 403);
    }

    const admin = createTrustedServiceRoleClient();
    
    const { data: game } = await admin
      .from("games")
      .select("id, status, engine_key, published_version_id")
      .eq("slug", gameSlug)
      .single();

    if (!game || game.status !== "published") {
      return apiError("NOT_FOUND", "Published game not found.", 404);
    }

    const { data: version } = await admin
      .from("game_versions")
      .select("id, status, config")
      .eq("id", game.published_version_id)
      .single();

    if (!version || version.status !== "published") {
      return apiError("NOT_FOUND", "Published game version not found.", 404);
    }

    const { data: difficulty } = await admin
      .from("game_difficulties")
      .select("id, active, config")
      .eq("game_version_id", version.id)
      .eq("key", difficultyKey ?? "standard")
      .single();

    if (!difficulty || !difficulty.active) {
      return apiError("NOT_FOUND", "Active game difficulty not found.", 404);
    }

    const seed = crypto.randomUUID().replace(/-/g, "");
    const nonce = crypto.randomBytes(32).toString("hex");
    const nonceHash = crypto.createHash("sha256").update(nonce).digest("hex");
    
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data: gameSession, error } = await admin
      .from("game_sessions")
      .insert({
        user_id: session.userId,
        game_id: game.id,
        game_version_id: version.id,
        difficulty_id: difficulty.id,
        seed,
        nonce_hash: nonceHash,
        status: "started",
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (error || !gameSession) {
      throw error || new Error("Failed to create game session.");
    }

    return apiSuccess({
      sessionId: gameSession.id,
      gameId: game.id,
      seed,
      nonce,
      expiresAt: expiresAt.toISOString(),
      version,
      difficulty,
    }, { status: 201 });
  } catch (error) {
    return toServerError(error, request, "api.games.sessions.start");
  }
}
