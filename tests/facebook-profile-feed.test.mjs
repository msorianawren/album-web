import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildFacebookEmbedUrl, canonicalizeFacebookUrl, getFacebookEmbedAspectRatio, inferFacebookEmbedKind, validateFacebookPosterUrl } from "../src/lib/facebook-feed/url.ts";
import { nativeVideoKeyFromUrl, validateNativeVideoMetadata, validateNativeVideoUrl } from "../src/lib/facebook-feed/native-video.ts";
import { normalizeFacebookFeedSelection } from "../src/lib/facebook-feed/settings.ts";

test("canonicalizes exact public Facebook hosts and removes tracking", () => {
  assert.equal(canonicalizeFacebookUrl("https://m.facebook.com/story.php?story_fbid=2&id=1&utm_source=test#comments"), "https://www.facebook.com/story.php?story_fbid=2&id=1");
  assert.equal(canonicalizeFacebookUrl("https://web.facebook.com/profile/videos/123/?ref=share"), "https://www.facebook.com/profile/videos/123/");
  assert.equal(inferFacebookEmbedKind("https://www.facebook.com/profile/reel/123/"), "reel");
  assert.equal(inferFacebookEmbedKind("https://www.facebook.com/profile/videos/123/"), "video");
});

test("rejects non-permalinks, credentials, short links, and lookalike Facebook hosts", () => {
  for (const url of [
    "http://www.facebook.com/post/1", "https://facebook.com.evil.example/post/1", "https://evil-facebook.com/post/1",
    "https://user:pass@www.facebook.com/post/1", "https://localhost/post/1", "https://127.0.0.1/post/1",
    "https://fb.watch/abc", "<iframe src=https://www.facebook.com/post/1>", "javascript:alert(1)", "data:text/html,x", "https://www.facebook.com/",
  ]) assert.throws(() => canonicalizeFacebookUrl(url));
});

test("only generates fixed official Facebook plugin URLs", () => {
  const canonical = canonicalizeFacebookUrl("https://www.facebook.com/profile/reel/123/");
  const reel = new URL(buildFacebookEmbedUrl(canonical, "reel"));
  assert.equal(reel.origin, "https://www.facebook.com");
  assert.equal(reel.pathname, "/plugins/post.php");
  assert.equal(reel.searchParams.get("href"), canonical);
  assert.equal(reel.searchParams.get("show_text"), "false");
  assert.equal(new URL(buildFacebookEmbedUrl(canonical, "video")).pathname, "/plugins/video.php");
});

test("accepts only project-hosted HTTPS posters and preserves content ratios", () => {
  const origin = "https://media.orianawren.example";
  assert.equal(validateFacebookPosterUrl("https://media.orianawren.example/landing/media/poster.webp", origin), "https://media.orianawren.example/landing/media/poster.webp");
  assert.throws(() => validateFacebookPosterUrl("https://images.example/poster.webp", origin));
  assert.throws(() => validateFacebookPosterUrl("http://media.orianawren.example/poster.webp", origin));
  assert.equal(getFacebookEmbedAspectRatio({ width: 1080, height: 1920, aspect_ratio: null }), 1080 / 1920);
  assert.equal(getFacebookEmbedAspectRatio({ width: null, height: null, aspect_ratio: "4:5" }), 4 / 5);
  assert.equal(getFacebookEmbedAspectRatio({ width: null, height: null, aspect_ratio: null }), 16 / 9);
});

test("accepts native video only from the configured custom media domain", () => {
  const origin = "https://media.orianawren.example";
  const url = "https://media.orianawren.example/landing/facebook-feed/videos/123/asset.mp4";
  assert.equal(nativeVideoKeyFromUrl(url, origin), "landing/facebook-feed/videos/123/asset.mp4");
  assert.equal(validateNativeVideoUrl(url, origin), url);
  assert.throws(() => nativeVideoKeyFromUrl("https://evil.example/landing/facebook-feed/videos/123/asset.mp4", origin));
  assert.throws(() => nativeVideoKeyFromUrl("https://bucket.r2.dev/landing/facebook-feed/videos/123/asset.mp4", "https://bucket.r2.dev"));
  assert.throws(() => nativeVideoKeyFromUrl("https://media.orianawren.example/landing/facebook-feed/videos/123/asset.mp4?token=bad", origin));
  assert.doesNotThrow(() => validateNativeVideoMetadata("video/mp4", 1));
  assert.throws(() => validateNativeVideoMetadata("video/webm", 100));
});

test("landing feed selection is normalized to six unique UUIDs", () => {
  const first = "11111111-1111-4111-8111-111111111111"; const second = "22222222-2222-4222-8222-222222222222";
  assert.deepEqual(normalizeFacebookFeedSelection([first, first, "bad", second]), [first, second]);
});

test("removed Page API implementation is absent from active source and configuration", async () => {
  const files = [".env.example", "next.config.ts", "vercel.json", "src/lib/db/worker.ts"];
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  for (const forbidden of ["META_" + "APP_SECRET", "META_" + "TOKEN_ENCRYPTION_KEY", "pages_" + "show_list", "pages_" + "read_engagement", "/api/cron/" + "meta-sync", "*." + "fbcdn.net"]) assert.equal(source.includes(forbidden), false, forbidden);
});

test("migration, rollback, and modal keep the curated feed secure and usable", async () => {
  const [migration, nativeMigration, rollback, player, editor, settings, nativeVideo, createRoute, deleteRoute] = await Promise.all([
    readFile("supabase/migrations/202607291000_social_embed_items.sql", "utf8"),
    readFile("supabase/migrations/202607291100_social_embed_native_playback.sql", "utf8"),
    readFile("supabase/rollbacks/202607291000_social_embed_items_rollback.sql", "utf8"),
    readFile("src/components/landing/FacebookVideoPlayer.tsx", "utf8"),
    readFile("src/components/studio/FacebookFeedLandingEditor.tsx", "utf8"),
    readFile("src/components/studio/SettingsCenter.tsx", "utf8"),
    readFile("src/lib/facebook-feed/native-video.ts", "utf8"),
    readFile("src/app/api/admin/facebook-feed/items/route.ts", "utf8"),
    readFile("src/app/api/admin/facebook-feed/items/[id]/route.ts", "utf8"),
  ]);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /drop policy if exists "No direct client social embed access"/i);
  assert.match(migration, /security definer set search_path = public/i);
  assert.match(migration, /grant execute on function public\.delete_social_embed_item_and_cleanup\(uuid\) to service_role/i);
  assert.match(rollback, /drop function if exists public\.delete_social_embed_item_and_cleanup\(uuid\)/i);
  assert.match(rollback, /drop table if exists public\.social_embed_items/i);
  assert.match(rollback, /drop column if exists facebook_feed_settings/i);
  assert.match(nativeMigration, /add column if not exists playback_mode/i);
  assert.match(nativeMigration, /video_url text/i);
  assert.match(nativeMigration, /video_mime_type text/i);
  assert.match(nativeMigration, /video_size_bytes bigint/i);
  assert.match(nativeMigration, /duration_seconds numeric/i);
  assert.match(nativeMigration, /video_mime_type = 'video\/mp4'/i);
  assert.match(player, /data-testid="facebook-video-dialog"/);
  assert.match(player, /data-testid="native-video-player"/);
  assert.match(player, /controls playsInline preload="metadata"/);
  assert.match(player, /object-contain/);
  assert.doesNotMatch(player, /window\.open/);
  assert.match(player, /event\.key !== "Tab"/);
  assert.match(player, /window\.setTimeout\(\(\) => setTimedOut\(true\), playerTimeoutMs\)/);
  assert.match(player, /View original on Facebook/);
  assert.match(player, /getFacebookEmbedAspectRatio/);
  assert.match(editor, /playbackMode: "native"/);
  assert.match(settings, /xhr\.send\(file\)/);
  assert.match(settings, /Range: "bytes=0-1"/);
  assert.match(settings, /hostname\.endsWith\("\.r2\.dev"\)/);
  assert.match(nativeVideo, /hostname\.endsWith\("\.r2\.dev"\)/);
  assert.match(createRoute, /getTrustedFounderDatabase/);
  assert.match(createRoute, /headR2Object/);
  assert.match(createRoute, /validateFacebookPosterUrl/);
  assert.match(deleteRoute, /delete_social_embed_item_and_cleanup/);
});
