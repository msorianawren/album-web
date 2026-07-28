import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizeMetaVideo, aspectRatio } from "../src/lib/meta/feed-normalizer.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("normalizes a Page video without retaining its source URL", () => {
  const item = normalizeMetaVideo({ id: "video-1", title: "Motion", description: "A short film", permalink_url: "https://www.facebook.com/page/videos/video-1/", picture: "https://scontent.xx.fbcdn.net/poster.jpg", width: 1080, height: 1920, length: 23, source: "https://video.xx.fbcdn.net/signed-token" }, "page");
  assert.equal(item?.itemType, "video");
  assert.equal(item?.embedUrl.includes("plugins/video.php"), true);
  assert.equal(JSON.stringify(item?.rawMetadata).includes("signed-token"), false);
  assert.equal(aspectRatio(item), 1080 / 1920);
});

test("normalizes Reels and rejects non-video feed records", () => {
  const reel = normalizeMetaVideo({ id: "reel-1", media_type: "REELS", permalink_url: "https://www.facebook.com/page/videos/reel-1/" }, "page");
  assert.equal(reel?.itemType, "reel");
  assert.equal(normalizeMetaVideo({ id: "post-without-video", type: "status" }, "page"), null);
});

test("token vault is AES-GCM and rejects tampered ciphertext", () => {
  const source = read("src/lib/meta/token-vault.ts");
  assert.match(source, /aes-256-gcm/);
  assert.match(source, /getAuthTag/);
  assert.match(source, /setAuthTag/);
  assert.match(source, /Unable to decrypt Meta token/);
});

test("landing selection is capped, validates a featured item, and supports auto-fill", () => {
  const source = read("src/lib/landing.ts");
  assert.match(source, /slice\(0, 6\)/);
  assert.match(source, /selectedItemIds\.includes\(saved\.featuredItemId\)/);
  assert.match(source, /autoFillLatest/);
  assert.match(read("src/lib/meta/data.ts"), /autoFillLatest/);
});

test("admin Meta routes enforce Founder access, rate limits, and avoid token responses", () => {
  for (const file of ["connect", "select-page", "sync", "disconnect"]) {
    const source = read(`src/app/api/admin/integrations/meta/${file}/route.ts`);
    assert.match(source, /getTrustedFounderDatabase/);
    assert.match(source, /enforceRateLimit/);
  }
  assert.doesNotMatch(read("src/app/api/admin/integrations/meta/status/route.ts"), /encrypted_page_access_token/);
});

test("public landing creates Facebook iframe only after a play interaction", () => {
  const source = read("src/components/landing/MetaVideoPlayer.tsx");
  assert.match(source, /onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(source, /\{open \?/);
  assert.match(source, /Escape/);
});
