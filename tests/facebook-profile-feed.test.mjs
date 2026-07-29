import assert from "node:assert/strict";
import test from "node:test";
import { buildFacebookEmbedUrl, canonicalizeFacebookUrl, getFacebookEmbedAspectRatio, inferFacebookEmbedKind, validateFacebookPosterUrl } from "../src/lib/facebook-feed/url.ts";
import { nativeVideoKeyFromUrl, validateNativeVideoMetadata, validateNativeVideoUrl } from "../src/lib/facebook-feed/native-video.ts";
import { normalizeFacebookFeedSelection } from "../src/lib/facebook-feed/settings.ts";
import { isHorizontalStorySwipe, nextStoryIndex, previousStoryIndex, storyProgress } from "../src/lib/facebook-feed/story.ts";

test("accepts public Facebook permalinks and rejects unsafe hosts", () => {
  assert.equal(canonicalizeFacebookUrl("https://m.facebook.com/profile/videos/123/?utm_source=test"), "https://www.facebook.com/profile/videos/123/");
  assert.equal(inferFacebookEmbedKind("https://www.facebook.com/profile/reel/123/"), "reel");
  for (const value of ["http://www.facebook.com/post/1", "https://fb.watch/abc", "https://facebook.com.evil.example/post/1", "https://user:pass@www.facebook.com/post/1"]) assert.throws(() => canonicalizeFacebookUrl(value));
});

test("keeps the Facebook viewer as a controlled fallback", () => {
  const canonical = canonicalizeFacebookUrl("https://www.facebook.com/profile/videos/123/");
  const url = new URL(buildFacebookEmbedUrl(canonical, "video"));
  assert.equal(url.origin, "https://www.facebook.com");
  assert.equal(url.pathname, "/plugins/video.php");
  assert.equal(url.searchParams.get("href"), canonical);
  assert.equal(getFacebookEmbedAspectRatio({ width: 1080, height: 1920, aspect_ratio: null }), 1080 / 1920);
});

test("allows only project-managed native MP4s and posters", () => {
  const origin = "https://media.orianawren.example";
  const videoUrl = "https://media.orianawren.example/landing/facebook-feed/videos/123/asset.mp4";
  assert.equal(nativeVideoKeyFromUrl(videoUrl, origin), "landing/facebook-feed/videos/123/asset.mp4");
  assert.equal(validateNativeVideoUrl(videoUrl, origin), videoUrl);
  assert.equal(validateFacebookPosterUrl("https://media.orianawren.example/landing/media/poster.webp", origin), "https://media.orianawren.example/landing/media/poster.webp");
  assert.throws(() => nativeVideoKeyFromUrl("https://bucket.r2.dev/landing/facebook-feed/videos/123/asset.mp4", "https://bucket.r2.dev"));
  assert.throws(() => nativeVideoKeyFromUrl("https://evil.example/landing/facebook-feed/videos/123/asset.mp4", origin));
  assert.throws(() => validateFacebookPosterUrl("https://images.example/poster.webp", origin));
  assert.doesNotThrow(() => validateNativeVideoMetadata("video/mp4", 1));
  assert.throws(() => validateNativeVideoMetadata("video/webm", 1));
});

test("bounds a landing sequence to twelve valid unique stories", () => {
  const ids = Array.from({ length: 14 }, (_, index) => `${String(index + 1).padStart(8, "0")}-1111-4111-8111-111111111111`);
  assert.equal(normalizeFacebookFeedSelection([...ids, ids[0], "unsafe"]).length, 12);
});

test("story sequence navigation, progress, and swipe intent are deterministic", () => {
  assert.equal(nextStoryIndex(2, 3), 0);
  assert.equal(previousStoryIndex(0, 3), 2);
  assert.equal(storyProgress(2, 8), 0.25);
  assert.equal(storyProgress(20, 8), 1);
  assert.equal(isHorizontalStorySwipe(200, 120, 10, 20), true);
  assert.equal(isHorizontalStorySwipe(200, 180, 10, 90), false);
});
