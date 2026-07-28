import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildFacebookEmbedUrl, canonicalizeFacebookUrl, inferFacebookEmbedKind } from "../src/lib/facebook-feed/url.ts";
import { normalizeFacebookFeedSelection } from "../src/lib/facebook-feed/settings.ts";
import { validateFacebookPosterUrl } from "../src/lib/facebook-feed/poster.ts";
import { resolveFacebookPlayerFrame } from "../src/lib/facebook-feed/player.ts";

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

test("landing feed selection is normalized to six unique UUIDs", () => {
  const ids = Array.from({ length: 7 }, (_, index) => `${index + 1}`.repeat(8) + `-1111-4111-8111-${`${index + 1}`.repeat(12)}`);
  assert.deepEqual(normalizeFacebookFeedSelection([ids[0], ids[0], "bad", ...ids.slice(1)]), ids.slice(0, 6));
});

test("posters must use the configured project R2 public origin", () => {
  assert.equal(validateFacebookPosterUrl("https://media.example.test/posters/frame.jpg", "https://media.example.test"), "https://media.example.test/posters/frame.jpg");
  for (const url of ["http://media.example.test/posters/frame.jpg", "https://evil.example/frame.jpg", "https://user:pass@media.example.test/frame.jpg"]) {
    assert.throws(() => validateFacebookPosterUrl(url, "https://media.example.test"));
  }
});

test("player uses content-aware ratios and keeps the fallback without creating an iframe before click", async () => {
  const reelStyle = resolveFacebookPlayerFrame({ embed_kind: "reel", width: null, height: null, aspect_ratio: null });
  const portraitStyle = resolveFacebookPlayerFrame({ embed_kind: "post", width: 4, height: 5, aspect_ratio: null });
  assert.equal(reelStyle.aspectRatio, "9 / 16"); assert.equal(portraitStyle.aspectRatio, "4 / 5");
  const source = await readFile("src/components/landing/FacebookVideoPlayer.tsx", "utf8");
  assert.match(source, /\{open \? <div/); assert.match(source, /View on Facebook/); assert.match(source, /event\.key !== "Tab"/); assert.match(source, /setTimedOut\(true\)/);
});

test("API and migration preserve Founder-only, atomic cleanup, unavailable filtering, and rollback", async () => {
  const [createRoute, itemRoute, data, migration, rollback] = await Promise.all([
    readFile("src/app/api/admin/facebook-feed/items/route.ts", "utf8"), readFile("src/app/api/admin/facebook-feed/items/[id]/route.ts", "utf8"), readFile("src/lib/facebook-feed/data.ts", "utf8"), readFile("supabase/migrations/202607291000_social_embed_items.sql", "utf8"), readFile("supabase/rollbacks/202607291000_social_embed_items_rollback.sql", "utf8"),
  ]);
  assert.match(createRoute, /getTrustedFounderDatabase/); assert.match(itemRoute, /delete_social_embed_item_and_cleanup/); assert.match(data, /\.eq\("is_available", true\)/);
  assert.match(migration, /canonical_url text not null unique/); assert.match(migration, /drop policy if exists/); assert.match(migration, /revoke all on function/); assert.match(migration, /grant execute.*service_role/);
  assert.match(rollback, /drop function if exists public\.delete_social_embed_item_and_cleanup/); assert.match(rollback, /drop table if exists public\.social_embed_items/);
});

test("removed Page API implementation is absent from active source and configuration", async () => {
  const files = [".env.example", "next.config.ts", "vercel.json", "src/lib/db/worker.ts"];
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  for (const forbidden of ["META_" + "APP_SECRET", "META_" + "TOKEN_ENCRYPTION_KEY", "pages_" + "show_list", "pages_" + "read_engagement", "/api/cron/" + "meta-sync", "*." + "fbcdn.net"]) assert.equal(source.includes(forbidden), false, forbidden);
});
