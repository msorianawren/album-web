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
