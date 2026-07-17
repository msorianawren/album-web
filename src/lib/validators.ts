import { z } from "zod";
import { albumLimits, albumStatuses, commentLimits } from "@/lib/config";
import { mediaSortModes } from "@/lib/media-sort";

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const albumCreateSchema = z.object({
  title: z.string().trim().min(1).max(albumLimits.title),
  slug: slugSchema.optional(),
  description: z.string().trim().max(albumLimits.description).optional().nullable(),
  status: z.enum(albumStatuses).default("public"),
  cover_url: z.string().url().optional().nullable(),
  feather_purchase_enabled: z.boolean().optional(),
  feather_price: z.number().int().min(1).max(100000).optional().nullable(),
});

export const albumUpdateSchema = albumCreateSchema
  .partial()
  .extend({
    cover_media_id: z.string().uuid().optional().nullable(),
    default_media_sort: z.enum(mediaSortModes).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const mediaUpdateSchema = z
  .object({
    album_id: z.string().uuid().optional(),
    title: z.string().trim().max(160).optional().nullable(),
    description: z.string().trim().max(1000).optional().nullable(),
    sort_order: z.number().int().min(0).optional(),
    featured_rank: z.number().int().min(0).max(100000).optional(),
    is_cover: z.boolean().optional(),
    download_allowed: z.boolean().optional(),
    original_download_allowed: z.boolean().optional(),
    security_status: z.enum(["processed", "needs_review", "rejected"]).optional(),
    security_notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const commentCreateSchema = z.object({
  albumId: z.string().uuid(),
  mediaId: z.string().uuid().optional().nullable(),
  author_name: z
    .string()
    .trim()
    .max(commentLimits.authorName)
    .optional()
    .nullable(),
  body: z.string().trim().min(1).max(commentLimits.body),
});

export const likeCreateSchema = z
  .object({
    albumId: z.string().uuid().optional().nullable(),
    mediaId: z.string().uuid().optional().nullable(),
    clientId: z.string().trim().min(6).max(200).optional().nullable(),
  })
  .refine((value) => value.albumId || value.mediaId, {
    message: "albumId or mediaId is required.",
  });

export const searchParamsSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z.enum(albumStatuses).optional(),
});

export const albumPageQuerySchema = searchParamsSchema.extend({
  cursor: z.string().trim().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(96).optional().default(24),
});

const puzzleTargetsSchema = z.record(z.enum(["3", "4", "5"]), z.object({
  seconds: z.number().int().min(15).max(3600),
  moves: z.number().int().min(1).max(2000),
})).default({
  "3": { seconds: 180, moves: 40 },
  "4": { seconds: 360, moves: 110 },
  "5": { seconds: 720, moves: 260 },
});

export const puzzleChallengeSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1200).default(""),
  collection: z.enum(["featured", "editorial_portraits", "traditional_elegance", "travel_stories", "seasonal"]),
  sourceType: z.enum(["album_media", "game_asset"]),
  sourceMediaId: z.string().uuid().nullable().optional(),
  puzzleAssetKey: z.string().trim().min(1).max(500).nullable().optional(),
  previewAssetKey: z.string().trim().min(1).max(500).nullable().optional(),
  focalX: z.number().min(0).max(1).default(0.5),
  focalY: z.number().min(0).max(1).default(0.5),
  allowedModes: z.array(z.enum(["sliding", "swap"])).min(1),
  allowedGridSizes: z.array(z.union([z.literal(3), z.literal(4), z.literal(5)])).min(1),
  visibility: z.enum(["public", "members"]).default("public"),
  targets: puzzleTargetsSchema,
  rewardMultiplier: z.number().min(0.5).max(2).default(1),
  baseSeed: z.string().trim().min(8).max(160),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
}).superRefine((value, context) => {
  if (value.sourceType === "album_media" && !value.sourceMediaId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceMediaId"], message: "A public album image is required." });
  }
  if (value.sourceType === "game_asset" && !value.puzzleAssetKey) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["puzzleAssetKey"], message: "A processed game image is required." });
  }
});

export const puzzleAttemptStartSchema = z.object({
  challengeId: z.string().uuid(),
  mode: z.enum(["sliding", "swap"]),
  gridSize: z.union([z.literal(3), z.literal(4), z.literal(5)]),
});

export const puzzleAttemptCompleteSchema = z.object({
  attemptId: z.string().uuid(),
  elapsedMs: z.number().int().min(250).max(7_200_000),
  trace: z.array(z.union([
    z.object({ tile: z.number().int().min(1).max(25) }),
    z.object({ from: z.number().int().min(0).max(24), to: z.number().int().min(0).max(24) }),
  ])).min(1).max(4000),
});
