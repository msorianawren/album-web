import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/hooks/useAlbumViewMemory.ts", import.meta.url), "utf8");
const hint = readFileSync(new URL("../src/components/albums/AlbumMemoryHint.tsx", import.meta.url), "utf8");

test("album memory keeps viewer preferences local without signed URLs", () => {
  assert.match(source, /saveViewerPreferences/);
  assert.match(source, /ViewerPresentation/);
  assert.match(source, /slideshowPace/);
  assert.match(source, /controlsPreference/);
  assert.doesNotMatch(source, /signedUrl|expiresAt|X-Amz/i);
});

test("viewer presentation keeps clean as the safe default and recognizes the prior focus setting", () => {
  const viewer = readFileSync(new URL("../src/components/media/MediaViewer.tsx", import.meta.url), "utf8");
  assert.match(viewer, /return value === "cinematic" \|\| value === "focus" \? "cinematic" : "clean"/);
  assert.match(viewer, /data-viewer-presentation=\{presentation\}/);
  assert.match(viewer, /viewerMode: presentation/);
});

test("continue viewing supports the first media index", () => {
  assert.match(hint, /lastMediaIndex === undefined/);
  assert.doesNotMatch(hint, /!viewState\.record\?\.lastMediaIndex/);
});
