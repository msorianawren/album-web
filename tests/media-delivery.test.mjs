import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getMediaDeliveryDescriptor,
  isExpectedMediaContentType,
  normalizeMediaDeliveryUrl,
  shouldBypassNextImageOptimization,
} from "../src/lib/media/delivery.ts";

const baseMedia = {
  id: "00000000-0000-4000-8000-000000000001",
  media_type: "image",
  title: "Editorial portrait",
  original_filename: "ảnh đẹp (1).jpg",
  url: "https://cdn.example.com/albums/ảnh đẹp (1).jpg",
  thumbnail_url: "https://cdn.example.com/thumb%20ready.webp",
  medium_url: "https://cdn.example.com/medium (1).webp",
  poster_url: null,
  width: 2400,
  height: 3000,
  mime_type: "image/jpeg",
  processing_status: "processed",
  security_status: "processed",
  download_allowed: true,
  original_download_allowed: false,
};

test("delivery descriptor applies one intentional public fallback order", () => {
  const delivery = getMediaDeliveryDescriptor(baseMedia, { albumStatus: "public" });
  assert.deepEqual(
    delivery.publicCard.candidates.map((candidate) => candidate.variant),
    ["thumbnail", "medium", "display"],
  );
  assert.deepEqual(
    delivery.viewer.candidates.map((candidate) => candidate.variant),
    ["medium", "display", "thumbnail"],
  );
  assert.equal(delivery.card.src, "https://cdn.example.com/thumb%20ready.webp");
  assert.equal(delivery.width, 2400);
  assert.equal(delivery.height, 3000);
  assert.equal(delivery.aspectRatio, 0.8);
});

test("unauthorized private delivery exposes only an explicit safe preview", () => {
  const delivery = getMediaDeliveryDescriptor(baseMedia, {
    albumStatus: "private",
    isAuthorized: false,
    safePreviewUrl: "https://cdn.example.com/safe-preview.webp",
  });
  assert.equal(delivery.authorizationState, "safe-preview-only");
  assert.equal(delivery.card.src, "https://cdn.example.com/safe-preview.webp");
  assert.equal(delivery.authorizedPrivateCard.src, null);
  assert.equal(delivery.download.src, null);
  assert.equal(delivery.originalDownload.src, null);
  assert.equal(delivery.downloadHref, null);
  assert.equal(
    JSON.stringify(delivery).includes("albums/%E1%BA%A3nh%20%C4%91%E1%BA%B9p"),
    false,
  );
});

test("authorized private delivery supports same-site gateway URLs without optimizer fetches", () => {
  const privateMedia = {
    ...baseMedia,
    url: "/api/media/00000000-0000-4000-8000-000000000001/content?variant=display",
    thumbnail_url: "/api/media/00000000-0000-4000-8000-000000000001/content?variant=thumbnail",
    medium_url: "/api/media/00000000-0000-4000-8000-000000000001/content?variant=medium",
  };
  const delivery = getMediaDeliveryDescriptor(privateMedia, {
    albumStatus: "private",
    isAuthorized: true,
  });
  assert.equal(delivery.authorizationState, "authorized-private");
  assert.equal(delivery.authorizedPrivateCard.candidates[0].bypassOptimization, true);
  assert.match(delivery.viewer.src, /^\/api\/media\//);
  assert.equal(delivery.downloadHref, `/api/media/${privateMedia.id}/download`);
});

test("pending, failed, and rejected media never select live card or viewer sources", () => {
  for (const media of [
    { ...baseMedia, processing_status: "pending" },
    { ...baseMedia, processing_status: "failed" },
    { ...baseMedia, security_status: "rejected" },
  ]) {
    const delivery = getMediaDeliveryDescriptor(media, { albumStatus: "public" });
    assert.equal(delivery.publicCard.src, null);
    assert.equal(delivery.card.src, delivery.placeholder.src);
    assert.equal(delivery.viewer.src, delivery.placeholder.src);
    assert.equal(delivery.downloadHref, null);
  }
});

test("URL normalization encodes Unicode and spaces once while preserving signed queries", () => {
  assert.equal(
    normalizeMediaDeliveryUrl("https://cdn.example.com/ảnh đẹp (1).jpg?X-Amz-Signature=a%2Fb"),
    "https://cdn.example.com/%E1%BA%A3nh%20%C4%91%E1%BA%B9p%20(1).jpg?X-Amz-Signature=a%2Fb",
  );
  assert.equal(
    normalizeMediaDeliveryUrl("https://cdn.example.com/already%20encoded.webp"),
    "https://cdn.example.com/already%20encoded.webp",
  );
  assert.equal(normalizeMediaDeliveryUrl("javascript:alert(1)"), null);
  assert.equal(normalizeMediaDeliveryUrl("//evil.example/media.webp"), null);
  assert.equal(
    shouldBypassNextImageOptimization("https://cdn.example.com/a.webp?X-Amz-Signature=secret"),
    true,
  );
});

test("content-type validation rejects HTML/login responses masquerading as media", () => {
  assert.equal(isExpectedMediaContentType("image/webp; charset=binary", "image"), true);
  assert.equal(isExpectedMediaContentType("video/mp4", "video"), true);
  assert.equal(isExpectedMediaContentType("text/html; charset=utf-8", "image"), false);
  assert.equal(isExpectedMediaContentType("application/json", "video"), false);
});

test("customer-facing media components do not select URL columns independently", () => {
  const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
  for (const file of [
    "src/components/media/MediaCard.tsx",
    "src/components/media/MediaViewer.tsx",
    "src/components/albums/AlbumCard.tsx",
    "src/components/albums/AlbumHeader.tsx",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /thumbnail_url\s*\?\?|medium_url\s*\?\?|poster_url\s*\?\?/);
    assert.match(source, /MediaDelivery|media\/delivery|LivingPreviewImages/);
  }
});

test("private album cards use granted gateway previews and keep ungranted cards on safe preview", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/albums/AlbumCard.tsx"),
    "utf8",
  );
  assert.match(source, /hasAuthorizedPrivatePreviews/);
  assert.match(source, /albumStatus: "private"/);
  assert.match(source, /createMediaDeliveryTarget\(album\.safe_preview_url, "safe-preview"\)/);
});
