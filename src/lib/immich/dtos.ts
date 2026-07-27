/**
 * Zod-validated DTOs for Immich API v3.0.3 responses.
 *
 * Behavioral reference: immich-reference/open-api/immich-openapi-specs.json
 *   (server/src/dtos/ in Immich source)
 *
 * Only the fields relevant to Oriana are included.
 * Do not import Immich SDK types directly — this is an isolated boundary.
 */
import "server-only";
import { z } from "zod";

// ── Asset ────────────────────────────────────────────────────────────────────

export const ImmichAssetTypeSchema = z.enum(["IMAGE", "VIDEO", "AUDIO", "OTHER"]);
export type ImmichAssetType = z.infer<typeof ImmichAssetTypeSchema>;

export const ImmichAssetResponseDtoSchema = z.object({
  id: z.string(),
  deviceAssetId: z.string().optional(),
  ownerId: z.string(),
  libraryId: z.string().nullable().optional(),
  type: ImmichAssetTypeSchema,
  originalPath: z.string().optional(), // not exposed to clients
  originalFileName: z.string().optional(),
  thumbhash: z.string().nullable().optional(),
  fileCreatedAt: z.string(),
  fileModifiedAt: z.string(),
  localDateTime: z.string().optional(),
  updatedAt: z.string().optional(),
  isFavorite: z.boolean(),
  isArchived: z.boolean().optional(),
  isTrashed: z.boolean().optional(),
  duration: z.string().optional(),
  exifInfo: z
    .object({
      make: z.string().nullable().optional(),
      model: z.string().nullable().optional(),
      exifImageWidth: z.number().nullable().optional(),
      exifImageHeight: z.number().nullable().optional(),
      fileSizeInByte: z.number().nullable().optional(),
      dateTimeOriginal: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      description: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type ImmichAssetResponseDto = z.infer<typeof ImmichAssetResponseDtoSchema>;

// ── Album ────────────────────────────────────────────────────────────────────

export const ImmichAlbumResponseDtoSchema = z.object({
  id: z.string(),
  albumName: z.string(),
  description: z.string().optional(),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  albumThumbnailAssetId: z.string().nullable().optional(),
  assetCount: z.number(),
  assets: z.array(ImmichAssetResponseDtoSchema).optional(),
});

export type ImmichAlbumResponseDto = z.infer<typeof ImmichAlbumResponseDtoSchema>;

// ── Server info ───────────────────────────────────────────────────────────────

export const ImmichServerVersionSchema = z.object({
  major: z.number(),
  minor: z.number(),
  patch: z.number(),
});

export const ImmichServerInfoSchema = z.object({
  version: ImmichServerVersionSchema.optional(),
  versionUrl: z.string().optional(),
});

export type ImmichServerVersion = z.infer<typeof ImmichServerVersionSchema>;

// ── Search results ────────────────────────────────────────────────────────────

export const ImmichSearchResponseSchema = z.object({
  assets: z.object({
    count: z.number(),
    total: z.number(),
    page: z.number(),
    items: z.array(ImmichAssetResponseDtoSchema),
  }),
});

export type ImmichSearchResponse = z.infer<typeof ImmichSearchResponseSchema>;
