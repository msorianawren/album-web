import assert from "node:assert/strict";
import test from "node:test";
import { cinematicDrift, slideshowInterval } from "../src/lib/media/cinematic-drift.ts";

test("cinematic drift is stable per media item and stays deliberately subtle", () => {
  const first = cinematicDrift("aa24d9fe-0f00-4000-9000-4d66487da001");
  assert.deepEqual(cinematicDrift("aa24d9fe-0f00-4000-9000-4d66487da001"), first);
  assert.equal(first.scale, 1.035);
  assert.match(first.x, /^-?1\.08%|-?0\.36%|0\.36%|1\.08%$/);
  assert.match(first.y, /^-?0\.87%|-?0\.29%|0\.29%|0\.87%$/);
});

test("slideshow pace gives still, slow, cinema, and video their intentional cadence", () => {
  assert.equal(slideshowInterval("still", false), 4_200);
  assert.equal(slideshowInterval("slow", false), 10_500);
  assert.equal(slideshowInterval("cinema", false), 7_000);
  assert.equal(slideshowInterval("cinema", true), 9_000);
});
