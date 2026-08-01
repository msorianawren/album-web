import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  isPortraitStory,
  isProjectMediaUrl,
  keysBelongToStory,
  storyPresignSchema,
  validateStoryLimits,
} from "../src/lib/admin-stories/contract.ts";
import { normalizeAdminStoriesSettingsValue } from "../src/lib/admin-stories/settings.ts";

const validMetadata = {
  filename: "founder-story.mp4",
  mimeType: "video/mp4",
  size: 12_000_000,
  width: 1080,
  height: 1920,
  durationSeconds: 28.4,
};
const validPoster = { filename: "poster.webp", mimeType: "image/webp", size: 145_000, width: 720, height: 1280 };

test("accepts supported portrait story metadata", () => {
  assert.equal(storyPresignSchema.safeParse({ video: validMetadata, poster: validPoster }).success, true);
  assert.equal(isPortraitStory(1080, 1920), true);
  assert.equal(isPortraitStory(1920, 1080), false);
  assert.equal(validateStoryLimits(validMetadata, { maxVideoSizeBytes: 20_000_000, maxDurationSeconds: 30 }), null);
});

test("rejects arbitrary media, oversize, long, and landscape videos", () => {
  assert.equal(storyPresignSchema.safeParse({ video: { ...validMetadata, mimeType: "video/quicktime" }, poster: validPoster }).success, false);
  assert.match(validateStoryLimits(validMetadata, { maxVideoSizeBytes: 1_000, maxDurationSeconds: 60 }), /exceeds/i);
  assert.match(validateStoryLimits(validMetadata, { maxVideoSizeBytes: 20_000_000, maxDurationSeconds: 2 }), /duration/i);
  assert.match(validateStoryLimits({ ...validMetadata, width: 1920, height: 1080 }, { maxVideoSizeBytes: 20_000_000, maxDurationSeconds: 60 }), /9:16/i);
});

test("requires paired Founder Story keys and the project media origin", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const videoKey = `landing/stories/${id}/video.mp4`;
  const posterKey = `landing/stories/${id}/poster.webp`;
  assert.equal(keysBelongToStory(id, videoKey, posterKey), true);
  assert.equal(keysBelongToStory(id, videoKey, "landing/stories/22222222-2222-4222-8222-222222222222/poster.webp"), false);
  assert.equal(keysBelongToStory(id, `landing/stories/${id}/../video.mp4`, posterKey), false);
  assert.equal(isProjectMediaUrl(`https://media.orianawren.com/${videoKey}`, "https://media.orianawren.com"), true);
  assert.equal(isProjectMediaUrl(`https://evil.example/${videoKey}`, "https://media.orianawren.com"), false);
});

test("landing settings retain only enabled, eyebrow, and heading", () => {
  const defaults = { enabled: false, eyebrow: "Behind the scenes", heading: "Founder Stories" };
  assert.deepEqual(normalizeAdminStoriesSettingsValue({ enabled: true, eyebrow: "  Motion  ", heading: "  Notes  ", selectedItemIds: ["legacy"] }, defaults), { enabled: true, eyebrow: "Motion", heading: "Notes" });
  assert.deepEqual(normalizeAdminStoriesSettingsValue(null, defaults), defaults);
});

test("homepage stays poster-only until the player is opened", async () => {
  const home = await readFile("src/components/landing/HomeAdminStories.tsx", "utf8");
  const player = await readFile("src/components/landing/StoryPlayer.tsx", "utf8");
  assert.equal(home.includes("<video"), false);
  assert.equal(home.includes("onMouseEnter"), false);
  assert.equal(player.includes("playsInline"), true);
  assert.equal(player.includes('preload="metadata"'), true);
  assert.equal(player.includes("autoPlay"), true);
  assert.equal(player.includes("muted"), true);
  assert.equal(player.includes("<dialog"), true);
  assert.equal(player.includes("showModal()"), true);
  assert.equal(player.includes("fixed inset-0"), false);
  assert.equal(player.includes("::backdrop"), false);
});

test("Founder Story upload never sends a media body through a site API", async () => {
  const editor = await readFile("src/components/studio/AdminStoryEditor.tsx", "utf8");
  const finalize = await readFile("src/app/api/admin/stories/finalize/route.ts", "utf8");
  assert.equal(editor.includes("uploadBlobDirectly"), true);
  assert.equal(editor.includes("/api/landing/upload/complete"), false);
  assert.equal(finalize.includes("getR2Object"), false);
  assert.equal(finalize.includes("putR2Object"), false);
  assert.equal(finalize.includes("sharp"), false);
});

test("admin routes guard trusted access, validate keys, and never use wildcard selects", async () => {
  const routes = ["src/app/api/admin/stories/route.ts", "src/app/api/admin/stories/presign/route.ts", "src/app/api/admin/stories/finalize/route.ts", "src/app/api/admin/stories/[id]/route.ts", "src/app/api/admin/stories/reorder/route.ts", "src/app/api/admin/stories/cancel/route.ts"];
  const sources = await Promise.all(routes.map((file) => readFile(file, "utf8")));
  for (const source of sources) {
    assert.equal(source.includes("getTrustedFounderDatabase(request)"), true);
    assert.equal(source.includes('select("*")'), false);
    assert.equal(source.includes("createPublicServerClient"), false);
  }
  assert.equal(sources[2].includes("keysBelongToStory"), true);
  assert.equal(sources[3].includes("video_r2_key"), true);
});

test("legacy Facebook runtime has no tracked source references", async () => {
  const files = ["src/app/page.tsx", "src/lib/types.ts", "src/components/studio/SettingsCenter.tsx"];
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  for (const forbidden of ["facebook" + "_feed_settings", "social" + "_embed_items", "HomeFacebook" + "Feed", "FacebookVideo" + "Player", "selected" + "ItemIds"]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
