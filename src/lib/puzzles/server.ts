import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { supabase } from "@/lib/supabase";
import { getPublicUrl } from "@/lib/r2";
import { calculatePuzzleReward } from "@/lib/puzzles/rewards";
import { derivePuzzleSeed, replayPuzzleTrace } from "@/lib/puzzles/engine";
import type { PuzzleChallenge, PuzzleGridSize, PuzzleMode, PuzzleResult, PuzzleTargets } from "@/lib/puzzles/types";
import type { PublicSession } from "@/lib/types";

type ChallengeRow = Record<string, unknown>;

export function isPuzzleSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  const message = typeof value.message === "string" ? value.message : "";
  return value.code === "42P01" || value.code === "PGRST205" || /puzzle_(challenges|attempts|user_results|user_profiles|user_badges)/.test(message);
}

function asModes(value: unknown): PuzzleMode[] {
  return Array.isArray(value) ? value.filter((item): item is PuzzleMode => item === "sliding" || item === "swap") : [];
}

function asGrids(value: unknown): PuzzleGridSize[] {
  return Array.isArray(value) ? value.filter((item): item is PuzzleGridSize => item === 3 || item === 4 || item === 5) : [];
}

function publicAssetUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.startsWith("http") || value.startsWith("/") ? value : getPublicUrl(value);
}

function mapChallenge(row: ChallengeRow): PuzzleChallenge {
  const media = row.media as Record<string, unknown> | null;
  return {
    id: String(row.id),
    title: String(row.title ?? "Untitled puzzle"),
    description: String(row.description ?? ""),
    collection: String(row.collection) as PuzzleChallenge["collection"],
    sourceType: String(row.source_type) as PuzzleChallenge["sourceType"],
    sourceMediaId: typeof row.source_media_id === "string" ? row.source_media_id : null,
    puzzleAssetKey: typeof row.puzzle_asset_key === "string" ? row.puzzle_asset_key : null,
    previewAssetKey: typeof row.preview_asset_key === "string" ? row.preview_asset_key : null,
    imageUrl: publicAssetUrl(media?.medium_url) ?? publicAssetUrl(media?.thumbnail_url) ?? publicAssetUrl(row.puzzle_asset_key),
    previewUrl: publicAssetUrl(media?.thumbnail_url) ?? publicAssetUrl(media?.medium_url) ?? publicAssetUrl(row.preview_asset_key) ?? publicAssetUrl(row.puzzle_asset_key),
    focalX: Number(row.focal_x ?? 0.5),
    focalY: Number(row.focal_y ?? 0.5),
    allowedModes: asModes(row.allowed_modes),
    allowedGridSizes: asGrids(row.allowed_grid_sizes),
    visibility: row.visibility === "members" ? "members" : "public",
    targets: (row.targets && typeof row.targets === "object" ? row.targets : {}) as PuzzleTargets,
    rewardMultiplier: Number(row.reward_multiplier ?? 1),
    baseSeed: String(row.base_seed ?? ""),
    status: String(row.status) as PuzzleChallenge["status"],
    publishedAt: typeof row.published_at === "string" ? row.published_at : null,
  };
}

async function rawChallenges(status?: "published" | "all") {
  let query = supabase
    .from("puzzle_challenges")
    .select("*, media:source_media_id(id, media_type, url, thumbnail_url, medium_url, processing_status, security_status, albums!media_album_id_fkey(status))")
    .order("published_at", { ascending: false });
  if (status === "published") query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ChallengeRow[];
}

function isPublicChallengeMedia(row: ChallengeRow) {
  if (row.source_type !== "album_media") return true;
  const media = row.media as Record<string, unknown> | null;
  const album = media?.albums as Record<string, unknown> | null;
  return media?.media_type === "image" && album?.status === "public" && media?.security_status !== "rejected" && !["failed", "quarantined", "deleted"].includes(String(media?.processing_status ?? ""));
}

export async function getPuzzleChallenges(session?: PublicSession) {
  const rows = await rawChallenges("published");
  return rows
    .filter(isPublicChallengeMedia)
    .map(mapChallenge)
    .filter((challenge) => challenge.visibility === "public" || Boolean(session?.userId && !session.isBlocked));
}

export async function getStudioPuzzleChallenges() {
  return (await rawChallenges("all")).filter(isPublicChallengeMedia).map(mapChallenge);
}

export async function getPuzzleChallengeForSession(id: string, session?: PublicSession) {
  const challenges = await getPuzzleChallenges(session);
  return challenges.find((challenge) => challenge.id === id) ?? null;
}

export async function getPuzzleResults(userId: string | null): Promise<Record<string, PuzzleResult>> {
  if (!userId) return {};
  const { data, error } = await supabase
    .from("puzzle_user_results")
    .select("challenge_id, mode, grid_size, best_time_ms, best_move_count, best_reward, completion_count")
    .eq("user_id", userId);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [
    `${row.challenge_id}:${row.mode}:${row.grid_size}`,
    {
      bestTimeMs: typeof row.best_time_ms === "number" ? row.best_time_ms : null,
      bestMoveCount: typeof row.best_move_count === "number" ? row.best_move_count : null,
      bestReward: Number(row.best_reward ?? 0),
      completionCount: Number(row.completion_count ?? 0),
    },
  ]));
}

export async function startPuzzleAttempt({ challenge, session, mode, gridSize }: {
  challenge: PuzzleChallenge;
  session: PublicSession;
  mode: PuzzleMode;
  gridSize: PuzzleGridSize;
}) {
  const userId = session.userId;
  if (!userId) throw new Error("Authentication required.");
  if (!challenge.allowedModes.includes(mode) || !challenge.allowedGridSizes.includes(gridSize)) throw new Error("Challenge configuration does not allow that puzzle.");
  const seed = derivePuzzleSeed(challenge.id, challenge.baseSeed, mode, gridSize);
  const { data, error } = await supabase
    .from("puzzle_attempts")
    .insert({ id: randomUUID(), challenge_id: challenge.id, user_id: userId, mode, grid_size: gridSize, seed })
    .select("id, seed, started_at")
    .single();
  if (error || !data) throw error ?? new Error("Could not start puzzle attempt.");
  return { attemptId: String(data.id), seed: String(data.seed), startedAt: String(data.started_at) };
}

async function grantPuzzleBadges({ userId, challenge, mode, gridSize, elapsedMs, moveCount }: {
  userId: string;
  challenge: PuzzleChallenge;
  mode: PuzzleMode;
  gridSize: PuzzleGridSize;
  elapsedMs: number;
  moveCount: number;
}) {
  const [{ data: results }, { data: existing }] = await Promise.all([
    supabase.from("puzzle_user_results").select("challenge_id, mode, grid_size, completion_count").eq("user_id", userId),
    supabase.from("puzzle_user_badges").select("badge_key").eq("user_id", userId),
  ]);
  const completed = results ?? [];
  const existingKeys = new Set((existing ?? []).map((row) => String(row.badge_key)));
  const targetMoves = challenge.targets[String(gridSize)]?.moves ?? 0;
  const uniqueChallenges = new Set(completed.map((row) => String(row.challenge_id))).size;
  const slidingChallenges = new Set(completed.filter((row) => row.mode === "sliding").map((row) => String(row.challenge_id))).size;
  const candidates = [
    completed.length === 1 ? "first_assembly" : null,
    slidingChallenges >= 10 ? "sliding_grace" : null,
    mode === "swap" && targetMoves > 0 && moveCount <= targetMoves ? "perfect_exchange" : null,
    elapsedMs < 60_000 ? "under_one_minute" : null,
    gridSize === 5 ? "master_5x5" : null,
    uniqueChallenges >= 10 ? "puzzle_collector" : null,
  ].filter((value): value is string => value !== null && !existingKeys.has(value));
  if (!candidates.length) return [];
  const { error } = await supabase.from("puzzle_user_badges").insert(candidates.map((badge_key) => ({
    user_id: userId,
    badge_key,
    source_challenge_id: challenge.id,
  })));
  if (error && error.code !== "23505") throw error;
  return candidates;
}

export async function finalizePuzzleAttempt({
  attemptId,
  session,
  elapsedMs,
  trace,
}: {
  attemptId: string;
  session: PublicSession;
  elapsedMs: number;
  trace: unknown;
}) {
  const userId = session.userId;
  if (!userId) throw new Error("Authentication required.");
  if (!Number.isInteger(elapsedMs) || elapsedMs < 250 || elapsedMs > 7_200_000) throw new Error("Invalid elapsed time.");
  const traceJson = JSON.stringify(trace);
  if (traceJson.length > 64_000) throw new Error("Puzzle trace is too large.");

  const { data: attempt, error: attemptError } = await supabase
    .from("puzzle_attempts")
    .select("id, challenge_id, user_id, mode, grid_size, seed, started_at, finalized_at, reward_earned")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();
  if (attemptError) throw attemptError;
  if (!attempt) throw new Error("Puzzle attempt not found.");
  const startedAt = new Date(String(attempt.started_at)).getTime();
  if (elapsedMs > Date.now() - startedAt + 10_000) throw new Error("Elapsed time is not plausible.");

  const challenge = await getPuzzleChallengeForSession(String(attempt.challenge_id), session);
  if (!challenge) throw new Error("Puzzle challenge is unavailable.");
  const mode = attempt.mode as PuzzleMode;
  const gridSize = Number(attempt.grid_size) as PuzzleGridSize;
  const replay = replayPuzzleTrace({ seed: String(attempt.seed), mode, size: gridSize, trace });
  if (!replay.valid) throw new Error("Puzzle trace does not solve the challenge.");

  const qualifyingReward = calculatePuzzleReward({ gridSize, mode, multiplier: challenge.rewardMultiplier, elapsedMs, moveCount: replay.moveCount, targets: challenge.targets });
  const traceDigest = createHash("sha256").update(traceJson).digest("hex");
  const { data, error } = await supabase.rpc("finalize_puzzle_attempt", {
    p_attempt_id: attemptId,
    p_user_id: userId,
    p_elapsed_ms: elapsedMs,
    p_move_count: replay.moveCount,
    p_trace: trace,
    p_trace_digest: traceDigest,
    p_qualified_reward: qualifyingReward,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  const badges = attempt.finalized_at ? [] : await grantPuzzleBadges({ userId, challenge, mode, gridSize, elapsedMs, moveCount: replay.moveCount });
  return {
    rewardEarned: Number(result?.reward_earned ?? attempt.reward_earned ?? 0),
    totalFeathers: Number(result?.total_feathers ?? 0),
    completionCount: Number(result?.completion_count ?? 0),
    moveCount: replay.moveCount,
    badges,
  };
}
