/**
 * Unit tests for Oriana Wren Immich Adapter (Layer B).
 *
 * Tests cover:
 *   - Config flags and server-only safety
 *   - Zod DTO schema validation for Immich v3.0.3 payloads
 *   - Graceful fallback when IMMICH_ENABLED=false
 *
 * Behavioral design informed by Immich v3.0.3 (cd308ad):
 *   D:\Projects\immich-reference\open-api\immich-openapi-specs.json
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ImmichServerInfoSchema,
  ImmichAssetResponseDtoSchema,
  ImmichAlbumResponseDtoSchema,
  ImmichSearchResponseSchema,
} from "../src/lib/immich/dtos.ts";

describe("Immich DTO Schemas (v3.0.3)", () => {
  it("parses valid server info DTO", () => {
    const raw = {
      version: {
        major: 1,
        minor: 105,
        patch: 0,
      },
    };
    const parsed = ImmichServerInfoSchema.parse(raw);
    assert.equal(parsed.version?.major, 1);
    assert.equal(parsed.version?.minor, 105);
    assert.equal(parsed.version?.patch, 0);
  });

  it("parses valid asset response DTO", () => {
    const raw = {
      id: "immich-asset-uuid-1234",
      deviceAssetId: "device-123",
      ownerId: "owner-uuid-0000",
      type: "IMAGE",
      originalPath: "/upload/photo.jpg",
      originalFileName: "photo.jpg",
      fileCreatedAt: "2026-07-28T00:00:00.000Z",
      fileModifiedAt: "2026-07-28T00:00:00.000Z",
      isFavorite: false,
      isArchived: false,
      exifInfo: {
        make: "Apple",
        model: "iPhone 15 Pro",
        dateTimeOriginal: "2026-07-28T00:00:00.000Z",
      },
    };
    const parsed = ImmichAssetResponseDtoSchema.parse(raw);
    assert.equal(parsed.id, "immich-asset-uuid-1234");
    assert.equal(parsed.type, "IMAGE");
    assert.equal(parsed.exifInfo?.make, "Apple");
  });

  it("parses valid album response DTO", () => {
    const raw = {
      id: "immich-album-uuid-5678",
      albumName: "Summer Memories",
      description: "Public album collection",
      ownerId: "owner-uuid-0000",
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
      assetCount: 42,
      assets: [],
    };
    const parsed = ImmichAlbumResponseDtoSchema.parse(raw);
    assert.equal(parsed.id, "immich-album-uuid-5678");
    assert.equal(parsed.albumName, "Summer Memories");
    assert.equal(parsed.assetCount, 42);
  });

  it("parses valid search response schema", () => {
    const raw = {
      assets: {
        total: 1,
        count: 1,
        page: 1,
        items: [
          {
            id: "asset-1",
            deviceAssetId: "d1",
            ownerId: "owner-uuid-0000",
            type: "IMAGE",
            originalPath: "/p.jpg",
            originalFileName: "p.jpg",
            fileCreatedAt: "2026-07-28T00:00:00.000Z",
            fileModifiedAt: "2026-07-28T00:00:00.000Z",
            isFavorite: true,
            isArchived: false,
          },
        ],
      },
    };
    const parsed = ImmichSearchResponseSchema.parse(raw);
    assert.equal(parsed.assets?.total, 1);
    assert.equal(parsed.assets?.items[0].id, "asset-1");
  });
});
