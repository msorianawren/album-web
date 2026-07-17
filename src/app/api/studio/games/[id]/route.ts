import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { puzzleChallengeSchema } from "@/lib/validators";
import { createTrustedServiceRoleClient } from "@/lib/db/trusted-service";

async function assertPublicImage(client: ReturnType<typeof createTrustedServiceRoleClient>, mediaId: string) {
  const { data } = await client.from("media").select("id, media_type, security_status, albums!inner(status)").eq("id", mediaId).eq("albums.status", "public").maybeSingle();
  if (!data || data.media_type !== "image" || data.security_status === "rejected") throw new Error("Only public album images may be used for a puzzle.");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only Studio administrators can manage puzzles.", 403);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body.action === "duplicate") {
      const { data: original, error: originalError } = await database.client.from("puzzle_challenges").select("*").eq("id", id).single();
      if (originalError || !original) return apiError("NOT_FOUND", "Puzzle challenge not found.", 404);
      const { data, error } = await database.client.from("puzzle_challenges").insert({
        title: `${original.title} copy`, description: original.description, collection: original.collection,
        source_type: original.source_type, source_media_id: original.source_media_id,
        puzzle_asset_key: original.puzzle_asset_key, preview_asset_key: original.preview_asset_key,
        focal_x: original.focal_x, focal_y: original.focal_y, allowed_modes: original.allowed_modes,
        allowed_grid_sizes: original.allowed_grid_sizes, visibility: original.visibility, targets: original.targets,
        reward_multiplier: original.reward_multiplier, status: "draft", published_at: null,
        base_seed: randomBytes(18).toString("hex"), created_by: database.session.userId,
      }).select("id").single();
      if (error || !data) throw error ?? new Error("Puzzle challenge could not be duplicated.");
      await logAuditEvent({ request, session: database.session, action: "admin_duplicate_puzzle_challenge", targetType: "puzzle_challenge", targetId: String(data.id) });
      return apiSuccess({ id: data.id });
    }
    const parsed = puzzleChallengeSchema.safeParse(body);
    if (!parsed.success) return apiError("INVALID_INPUT", "Invalid puzzle challenge.", 400, parsed.error.flatten());
    if (parsed.data.sourceType === "album_media") await assertPublicImage(database.client, parsed.data.sourceMediaId!);
    const { error } = await database.client.from("puzzle_challenges").update({
      title: parsed.data.title, description: parsed.data.description, collection: parsed.data.collection,
      source_type: parsed.data.sourceType, source_media_id: parsed.data.sourceMediaId ?? null,
      puzzle_asset_key: parsed.data.puzzleAssetKey ?? null, preview_asset_key: parsed.data.previewAssetKey ?? null,
      focal_x: parsed.data.focalX, focal_y: parsed.data.focalY, allowed_modes: parsed.data.allowedModes,
      allowed_grid_sizes: parsed.data.allowedGridSizes, visibility: parsed.data.visibility, targets: parsed.data.targets,
      reward_multiplier: parsed.data.rewardMultiplier, base_seed: parsed.data.baseSeed,
      status: parsed.data.status, published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) throw error;
    await logAuditEvent({ request, session: database.session, action: "admin_update_puzzle_challenge", targetType: "puzzle_challenge", targetId: id });
    return apiSuccess({ id });
  } catch (error) {
    return toServerError(error, request, "api.studio.games.update");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only Studio administrators can manage puzzles.", 403);
  try {
    const { id } = await params;
    const { count, error: countError } = await database.client.from("puzzle_attempts").select("id", { count: "exact", head: true }).eq("challenge_id", id);
    if (countError) throw countError;
    const query = count ? database.client.from("puzzle_challenges").update({ status: "archived" }).eq("id", id) : database.client.from("puzzle_challenges").delete().eq("id", id);
    const { error } = await query;
    if (error) throw error;
    await logAuditEvent({ request, session: database.session, action: count ? "admin_archive_puzzle_challenge" : "admin_delete_puzzle_challenge", targetType: "puzzle_challenge", targetId: id });
    return apiSuccess({ archived: Boolean(count) });
  } catch (error) {
    return toServerError(error, request, "api.studio.games.delete");
  }
}
