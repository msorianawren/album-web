import assert from "node:assert/strict";
import test from "node:test";
import { resolveViewerSwipe } from "../src/hooks/media-viewer/useViewerGestures.ts";
import { readFile } from "node:fs/promises";

test("viewer gesture intent requires a deliberate horizontal swipe", () => {
  assert.equal(resolveViewerSwipe({ deltaX: -84, deltaY: 12, velocityX: -0.1, pointerType: "touch" }), "next");
  assert.equal(resolveViewerSwipe({ deltaX: 36, deltaY: 4, velocityX: 0.6, pointerType: "touch" }), "previous");
  assert.equal(resolveViewerSwipe({ deltaX: 22, deltaY: 20, velocityX: 0.1, pointerType: "touch" }), "none");
});

test("viewer gesture intent reserves vertical gestures for touch interaction", () => {
  assert.equal(resolveViewerSwipe({ deltaX: 8, deltaY: 112, velocityX: 0, pointerType: "touch" }), "close");
  assert.equal(resolveViewerSwipe({ deltaX: 4, deltaY: -84, velocityX: 0, pointerType: "touch" }), "info");
  assert.equal(resolveViewerSwipe({ deltaX: 4, deltaY: 112, velocityX: 0, pointerType: "mouse" }), "none");
});

test("viewer batches drag transforms to the display frame and keeps the filmstrip isolated", async () => {
  const [gestures, viewer, filmstrip] = await Promise.all([
    readFile(new URL("../src/hooks/media-viewer/useViewerGestures.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/media/MediaViewer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/media/viewer/ViewerFilmstrip.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(gestures, /window\.requestAnimationFrame/);
  assert.match(gestures, /pendingTransform/);
  assert.match(gestures, /flushTransform\(\)/);
  assert.match(gestures, /onToggleFullscreen\(\)/);
  assert.match(viewer, /onPointerMove=\{revealControls\}/);
  assert.match(viewer, /data-viewer-gesture-surface/);
  assert.match(viewer, /data-viewer-chrome="top"[\s\S]*absolute inset-x-0 top-0/);
  assert.match(viewer, /data-viewer-chrome="bottom"[\s\S]*absolute inset-x-0 bottom-0/);
  assert.match(filmstrip, /memo\(function ViewerFilmstrip/);
});
