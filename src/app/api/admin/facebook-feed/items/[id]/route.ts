import { NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { facebookFeedColumns } from "@/lib/facebook-feed/data";
import { canonicalizeFacebookUrl, inferFacebookEmbedKind } from "@/lib/facebook-feed/url";
import type { PublicSession } from "@/lib/types";

const patchInput = z.object({
  sourceUrl: z.string().trim().min(1).max(2_000).optional(), embedKind: z.enum(["auto", "post", "video", "reel"]).optional(),
  posterUrl: z.string().url().max(2_000).optional(), posterAlt: z.string().trim().max(240).nullable().optional(),
  title: z.string().trim().max(180).nullable().optional(), caption: z.string().trim().max(1_500).nullable().optional(),
  publishedAt: z.string().trim().max(80).nullable().optional(), width: z.number().int().positive().max(10_000).nullable().optional(), height: z.number().int().positive().max(10_000).nullable().optional(),
  aspectRatio: z.enum(["auto", "9:16", "4:5", "1:1", "16:9"]).nullable().optional(), isAvailable: z.boolean().optional(), availabilityNote: z.string().trim().max(500).nullable().optional(),
});
function nullText(value: string | null | undefined) { return value?.trim() || null; }
function published(value: string | null | undefined) { if (!value) return null; const date = new Date(value); if (Number.isNaN(date.getTime())) throw new Error("Published date is invalid."); return date.toISOString(); }
async function limited(request: NextRequest, session: PublicSession) { const result = await enforceRateLimit({ request, session, policy: { action: "facebook_feed_mutation", limit: 30, windowSeconds: 60 } }); return result.allowed ? null : apiError("RATE_LIMITED", "Please wait before changing the Facebook feed again.", 429, { retryAfterSeconds: result.retryAfterSeconds }); }
function invalidate() { revalidateTag("facebook-curated-feed", "max"); revalidateTag("landing-page", "max"); revalidatePath("/"); }

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const database = await getTrustedFounderDatabase(request); if (!database) return apiError("FORBIDDEN", "Only the Founder can manage Facebook feed items.", 403);
  const limit = await limited(request, database.session); if (limit) return limit;
  try {
    const parsed = patchInput.safeParse(await request.json()); if (!parsed.success) return apiError("INVALID_INPUT", "Check the Facebook feed fields.", 400);
    const { id } = await params;
    const { data: existing, error: readError } = await database.client.from("social_embed_items").select("source_url,canonical_url,embed_kind").eq("id", id).eq("provider", "facebook").maybeSingle();
    if (readError) throw readError; if (!existing) return apiError("NOT_FOUND", "Facebook feed item not found.", 404);
    const input = parsed.data; const sourceUrl = input.sourceUrl ?? existing.source_url; const canonicalUrl = canonicalizeFacebookUrl(sourceUrl);
    const update = {
      ...(input.sourceUrl !== undefined || input.embedKind !== undefined ? { source_url: sourceUrl, canonical_url: canonicalUrl, embed_kind: inferFacebookEmbedKind(canonicalUrl, input.embedKind ?? existing.embed_kind) } : {}),
      ...(input.posterUrl !== undefined ? { poster_url: input.posterUrl.trim() } : {}), ...(input.posterAlt !== undefined ? { poster_alt: nullText(input.posterAlt) } : {}), ...(input.title !== undefined ? { title: nullText(input.title) } : {}), ...(input.caption !== undefined ? { caption: nullText(input.caption) } : {}), ...(input.publishedAt !== undefined ? { published_at: published(input.publishedAt) } : {}), ...(input.width !== undefined ? { width: input.width } : {}), ...(input.height !== undefined ? { height: input.height } : {}), ...(input.aspectRatio !== undefined ? { aspect_ratio: input.aspectRatio === "auto" ? null : input.aspectRatio } : {}), ...(input.isAvailable !== undefined ? { is_available: input.isAvailable } : {}), ...(input.availabilityNote !== undefined ? { availability_note: nullText(input.availabilityNote) } : {}),
    };
    const { data, error } = await database.client.from("social_embed_items").update(update).eq("id", id).eq("provider", "facebook").select(facebookFeedColumns).single();
    if (error?.code === "23505") return apiError("CONFLICT", "This Facebook permalink is already in the library.", 409); if (error) throw error;
    await logAuditEvent({ request, session: database.session, action: "facebook_feed_item_updated", targetType: "social_embed_item", targetId: id }); invalidate(); return apiSuccess({ item: data });
  } catch (error) { return error instanceof Error && (error.message.startsWith("Use ") || error.message.startsWith("Enter ")) ? apiError("INVALID_INPUT", error.message, 400) : toServerError(error, request, "facebook-feed.update"); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const database = await getTrustedFounderDatabase(request); if (!database) return apiError("FORBIDDEN", "Only the Founder can manage Facebook feed items.", 403);
  const limit = await limited(request, database.session); if (limit) return limit;
  try { const { id } = await params; const { data, error } = await database.client.rpc("delete_social_embed_item_and_cleanup", { p_item_id: id }); if (error) throw error; if (!data) return apiError("NOT_FOUND", "Facebook feed item not found.", 404); await logAuditEvent({ request, session: database.session, action: "facebook_feed_item_deleted", targetType: "social_embed_item", targetId: id }); invalidate(); return apiSuccess({ deleted: true }); } catch (error) { return toServerError(error, request, "facebook-feed.delete"); }
}
