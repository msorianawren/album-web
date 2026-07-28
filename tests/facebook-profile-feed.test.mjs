import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildFacebookEmbedUrl, canonicalizeFacebookUrl, inferFacebookEmbedKind } from "../src/lib/facebook-feed/url.ts";
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

test("landing feed selection is normalized to six unique UUIDs", () => {
  const first = "11111111-1111-4111-8111-111111111111"; const second = "22222222-2222-4222-8222-222222222222";
  assert.deepEqual(normalizeFacebookFeedSelection([first, first, "bad", second]), [first, second]);
});

test("removed Page API implementation is absent from active source and configuration", async () => {
  const files = [".env.example", "next.config.ts", "vercel.json", "src/lib/db/worker.ts"];
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  for (const forbidden of ["META_" + "APP_SECRET", "META_" + "TOKEN_ENCRYPTION_KEY", "pages_" + "show_list", "pages_" + "read_engagement", "/api/cron/" + "meta-sync", "*." + "fbcdn.net"]) assert.equal(source.includes(forbidden), false, forbidden);
});
