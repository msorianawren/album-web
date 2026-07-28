import { NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { facebookFeedColumns, listFacebookFeedItems } from "@/lib/facebook-feed/data";
import { canonicalizeFacebookUrl, inferFacebookEmbedKind } from "@/lib/facebook-feed/url";
import { FacebookFeedInputError, validateFacebookPosterUrl } from "@/lib/facebook-feed/poster";

const itemInput = z.object({
  sourceUrl: z.string().trim().min(1).max(2_000),
  embedKind: z.enum(["auto", "post", "video", "reel"]).default("auto"),
  posterUrl: z.string().url().max(2_000),
  posterAlt: z.string().trim().max(240).optional().nullable(),
  title: z.string().trim().max(180).optional().nullable(),
  caption: z.string().trim().max(1_500).optional().nullable(),
  publishedAt: z.string().trim().max(80).optional().nullable(),
  width: z.number().int().positive().max(10_000).optional().nullable(),
  height: z.number().int().positive().max(10_000).optional().nullable(),
  aspectRatio: z.enum(["auto", "9:16", "4:5", "1:1", "16:9"]).optional().nullable(),
  isAvailable: z.boolean().default(true),
  availabilityNote: z.string().trim().max(500).optional().nullable(),
});

function cleanText(value: string | null | undefined) { return value?.trim() || null; }
function toPublishedAt(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Published date is invalid.");
  return date.toISOString();
}
function toRow(input: z.infer<typeof itemInput>) {
  const canonicalUrl = canonicalizeFacebookUrl(input.sourceUrl);
  return {
    provider: "facebook" as const,
    source_url: input.sourceUrl.trim(),
    canonical_url: canonicalUrl,
    embed_kind: inferFacebookEmbedKind(canonicalUrl, input.embedKind),
    poster_url: validateFacebookPosterUrl(input.posterUrl),
    poster_alt: cleanText(input.posterAlt), title: cleanText(input.title), caption: cleanText(input.caption),
    published_at: toPublishedAt(input.publishedAt), width: input.width ?? null, height: input.height ?? null,
    aspect_ratio: input.aspectRatio === "auto" ? null : input.aspectRatio ?? null,
    is_available: input.isAvailable, availability_note: cleanText(input.availabilityNote),
  };
}
async function rateLimit(request: NextRequest, session: Parameters<typeof enforceRateLimit>[0]["session"]) {
  const result = await enforceRateLimit({ request, session, policy: { action: "facebook_feed_mutation", limit: 30, windowSeconds: 60 } });
  return result.allowed ? null : apiError("RATE_LIMITED", "Please wait before changing the Facebook feed again.", 429, { retryAfterSeconds: result.retryAfterSeconds });
}

export async function GET(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can manage Facebook feed items.", 403);
  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 24));
    return apiSuccess(await listFacebookFeedItems(database.client, { page, limit, search: request.nextUrl.searchParams.get("search") ?? "" }));
  } catch (error) { return toServerError(error, request, "facebook-feed.list"); }
}

export async function POST(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Only the Founder can manage Facebook feed items.", 403);
  const limited = await rateLimit(request, database.session); if (limited) return limited;
  try {
    const parsed = itemInput.safeParse(await request.json());
    if (!parsed.success) return apiError("INVALID_INPUT", "Check the Facebook permalink and required poster.", 400);
    const { data, error } = await database.client.from("social_embed_items").insert({ ...toRow(parsed.data), created_by: database.session.userId }).select(facebookFeedColumns).single();
    if (error?.code === "23505") return apiError("CONFLICT", "This Facebook permalink is already in the library.", 409);
    if (error) throw error;
    await logAuditEvent({ request, session: database.session, action: "facebook_feed_item_created", targetType: "social_embed_item", targetId: data.id });
    revalidateTag("facebook-curated-feed", "max"); revalidateTag("landing-page", "max"); revalidatePath("/");
    return apiSuccess({ item: data }, { status: 201 });
  } catch (error) { return error instanceof FacebookFeedInputError || error instanceof Error && (error.message.startsWith("Use ") || error.message.startsWith("Enter ") || error.message.startsWith("Published ")) ? apiError("INVALID_INPUT", error.message, 400) : toServerError(error, request, "facebook-feed.create"); }
}
