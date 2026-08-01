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
});

test("the botanical tree uses one non-scrubbed timeline and deterministic branches", () => {
  const tree = read("src/components/landing/SocialLinksTree.tsx");
  assert.equal((tree.match(/gsap\.timeline/g) || []).length, 1);
  assert.equal(tree.includes("scrub:"), false);
  assert.match(tree, /once: true/);
  assert.match(tree, /lcb-tree__stem/);
  assert.match(tree, /lcb-tree__branch-path/);
  assert.match(tree, /lcb-tree__leaves/);
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
