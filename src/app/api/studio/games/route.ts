import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { getStudioPuzzleChallenges } from "@/lib/puzzles/server";
import { puzzleChallengeSchema } from "@/lib/validators";
import { createTrustedServiceRoleClient } from "@/lib/db/trusted-service";

async function assertPublicImage(client: ReturnType<typeof createTrustedServiceRoleClient>, mediaId: string) {
  const { data, error } = await client
    .from("media")
    .select("id, media_type, processing_status, security_status, albums!inner(status)")
    .eq("id", mediaId)
    .eq("albums.status", "public")
    .maybeSingle();
  if (error || !data || data.media_type !== "image" || data.security_status === "rejected" || ["failed", "quarantined", "deleted"].includes(String(data.processing_status ?? ""))) {
    throw new Error("Only ready public album images may be used for a puzzle.");
  }
}

export async function GET(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only Studio administrators can manage puzzles.", 403);
  try {
    if (request.nextUrl.searchParams.get("media") === "public-images") {
      const { data, error } = await database.client
        .from("media")
        .select("id, title, original_filename, thumbnail_url, medium_url, width, height, albums!inner(id, title, status)")
        .eq("media_type", "image")
        .eq("albums.status", "public")
        .neq("security_status", "rejected")
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return apiSuccess({ media: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return apiSuccess({ challenges: await getStudioPuzzleChallenges() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return toServerError(error, request, "api.studio.games.list");
  }
}

export async function POST(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only Studio administrators can manage puzzles.", 403);
  try {
    const parsed = puzzleChallengeSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return apiError("INVALID_INPUT", "Invalid puzzle challenge.", 400, parsed.error.flatten());
    if (parsed.data.sourceType === "album_media") await assertPublicImage(database.client, parsed.data.sourceMediaId!);
    const { data, error } = await database.client.from("puzzle_challenges").insert({
      title: parsed.data.title,
      description: parsed.data.description,
      collection: parsed.data.collection,
      source_type: parsed.data.sourceType,
      source_media_id: parsed.data.sourceMediaId ?? null,
      puzzle_asset_key: parsed.data.puzzleAssetKey ?? null,
      preview_asset_key: parsed.data.previewAssetKey ?? null,
      focal_x: parsed.data.focalX,
      focal_y: parsed.data.focalY,
      allowed_modes: parsed.data.allowedModes,
      allowed_grid_sizes: parsed.data.allowedGridSizes,
      visibility: parsed.data.visibility,
      targets: parsed.data.targets,
      reward_multiplier: parsed.data.rewardMultiplier,
      base_seed: parsed.data.baseSeed || randomBytes(18).toString("hex"),
      status: parsed.data.status,
      created_by: database.session.userId,
      published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
    }).select("id").single();
    if (error || !data) throw error ?? new Error("Puzzle challenge could not be created.");
    await logAuditEvent({ request, session: database.session, action: "admin_create_puzzle_challenge", targetType: "puzzle_challenge", targetId: String(data.id) });
    return apiSuccess({ id: data.id }, { status: 201 });
  } catch (error) {
    return toServerError(error, request, "api.studio.games.create");
  }
}
