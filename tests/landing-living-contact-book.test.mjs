import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("the opening spread restores the original hero, portrait, and gallery image set", () => {
  const hero = read("src/components/HomeHero.tsx");
  const page = read("src/app/page.tsx");
  assert.match(hero, /landing\.hero_image_url/);
  assert.match(hero, /landing\.portrait_image_url/);
  assert.match(hero, /landing\.gallery_image_url/);
  assert.match(hero, /homepage_hero_preset/);
  assert.match(hero, /preset === "editorial"/);
  assert.match(hero, /preset === "minimal"/);
  assert.match(hero, /preset === "split"/);
  assert.match(page, /<HomeHero landing=\{landing\} settings=\{settings\}/);
});

test("the transparent landing keeps the animated environment visible", () => {
  const css = read("src/components/landing/landing-home.css");
  const environmentFallbackCss = read("src/components/environment/EnvironmentStaticFallback.css");
  assert.match(css, /environment-custom-background\s*\{[^}]*0\.34/s);
  assert.doesNotMatch(environmentFallbackCss, /sakura-fallback/);
  assert.match(css, /\.lcb-hero\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /\.lcb-social::before\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.lcb-intro,[\s\S]*var\(--surface\) 28%/s);
  assert.match(css, /\.lcb-intro,[\s\S]*backdrop-filter:\s*blur\(9px\)/s);
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

test("the social tree restores scroll-linked vine drawing with reduced-motion fallback", () => {
  const tree = read("src/components/landing/SocialLinksTree.tsx");
  const page = read("src/app/page.tsx");
  assert.match(tree, /strokeDashoffset:\s*0/);
  assert.match(tree, /start:\s*"top 80%"/);
  assert.match(tree, /end:\s*"bottom 90%"/);
  assert.match(tree, /scrub:\s*0\.5/);
  assert.match(tree, /prefers-reduced-motion: reduce/);
  assert.match(tree, /social_tree_style/);
  assert.match(page, /<SocialLinksTree links=\{landing\.social_links\} settings=\{settings\}/);
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
