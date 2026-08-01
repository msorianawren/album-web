import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("the opening spread has one priority image and keeps the editorial body out of the hero", () => {
  const hero = read("src/components/HomeHero.tsx");
  const intro = read("src/components/landing/HomeEditorialIntro.tsx");
  const css = read("src/components/landing/landing-home.css");
  assert.equal((hero.match(/priority/g) || []).length, 1);
  assert.equal((hero.match(/fetchPriority="high"/g) || []).length, 1);
  assert.equal(hero.includes("landing.body"), false);
  assert.equal(intro.includes("landing.body"), true);
  assert.match(css, /\.lcb-hero__dominant\s*\{[^}]*min-height/s);
  assert.doesNotMatch(css, /\.lcb-hero__dominant[^}]*display:\s*none/s);
  assert.match(css, /\.lcb-hero__dominant img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(css, /\.lcb-hero__support img\s*\{[^}]*object-fit:\s*contain/s);
});

test("the transparent landing keeps the animated environment visible", () => {
  const css = read("src/components/landing/landing-home.css");
  const environmentFallbackCss = read("src/components/environment/EnvironmentStaticFallback.css");
  assert.match(css, /environment-custom-background\s*\{[^}]*0\.34/s);
  assert.doesNotMatch(environmentFallbackCss, /sakura-fallback/);
  assert.match(css, /\.lcb-hero\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /\.lcb-social::before\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.lcb-intro,[\s\S]*backdrop-filter:\s*blur\(14px\)/s);
});

test("featured collections prefer a display-sized derivative over thumbnails", () => {
  const collections = read("src/components/landing/HomeAlbumWorlds.tsx");
  assert.match(collections, /preferred\?\.medium_url/);
  assert.match(collections, /preferred\?\.card_url/);
  assert.ok(collections.indexOf("preferred?.medium_url") < collections.indexOf("preferred?.thumbnail_url"));
});

test("gallery video is interaction-gated and never autoplays", () => {
  const gallery = read("src/components/landing/HomeMediaGallery.tsx");
  assert.match(gallery, /activeVideoId === item\.id/);
  assert.match(gallery, /onClick=\{\(\) => setActiveVideoId\(item\.id\)\}/);
  assert.match(gallery, /preload="metadata"/);
  assert.equal(gallery.includes("autoPlay"), false);
});

test("the story viewer uses a contained native dialog and loads only its current video", () => {
  const player = read("src/components/landing/StoryPlayer.tsx");
  assert.match(player, /<dialog/);
  assert.match(player, /showModal\(\)/);
  assert.match(player, /key=\{current\.id\}/);
  assert.equal(player.includes("fixed inset-0"), false);
  assert.equal(player.includes("bg-black/95"), false);
  assert.match(player, /autoPlay/);
  assert.match(player, /video\.muted = false/);
  assert.match(player, /video\.volume = 1/);
  assert.match(player, /scaleX: targetRect\.width \/ roomRect\.width/);
  assert.match(player, /scaleY: targetRect\.height \/ roomRect\.height/);
  assert.match(player, /duration: 0\.42/);
  assert.match(player, /onClose\(currentIndex\)/);
  assert.doesNotMatch(player, /\n\s+muted(?:\s|=)/);
  assert.match(player, /onEnded=/);
});

test("the botanical tree uses one non-scrubbed timeline and deterministic branches", () => {
  const tree = read("src/components/landing/SocialLinksTree.tsx");
  assert.equal((tree.match(/gsap\.timeline/g) || []).length, 1);
  assert.equal(tree.includes("scrub:"), false);
  assert.match(tree, /once: true/);
  assert.match(tree, /lcb-tree__stem/);
  assert.match(tree, /lcb-tree__branch-path/);
  assert.match(tree, /lcb-tree__leaves/);
  assert.equal(tree.includes("lcb-tree__secondary"), false);
});

test("landing sections keep the requested narrative order without disabled placeholders", () => {
  const page = read("src/app/page.tsx");
  const ordered = ["<HomeHero", "<HomeEditorialIntro", "<HomeAlbumWorlds", "<HomeAdminStories", "<HomeMediaGallery", "<HomePrivateExperience", "<HomeCreativeServices", "<HomeCollaborators", "<SocialLinksTree", "<HomePersonalLetterWrapper", "<AppFooter"];
  let cursor = -1;
  for (const component of ordered) {
    const next = page.indexOf(component);
    assert.ok(next > cursor, component);
    cursor = next;
  }
  assert.equal(page.includes('fallback={<div className="h-96" />}'), false);
});
