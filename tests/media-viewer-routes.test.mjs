import assert from "node:assert/strict";
import test from "node:test";
import {
  viewerIndexFromMediaId,
  viewerUrlForMedia,
  viewerUrlWithoutMedia,
} from "../src/lib/media/viewer-routes.ts";

test("viewer deep links add only a safe media id while preserving album state", () => {
  assert.equal(
    viewerUrlForMedia("https://orianawren.com/albums/red-kimono?sort=manual#media-grid", "media-02"),
    "/albums/red-kimono?sort=manual&media=media-02#media-grid",
  );
});

test("closing a direct viewer link removes only the media parameter", () => {
  assert.equal(
    viewerUrlWithoutMedia("https://orianawren.com/albums/red-kimono?media=media-02&sort=manual#media-grid"),
    "/albums/red-kimono?sort=manual#media-grid",
  );
});

test("viewer deep links reject media ids that are not available to this album payload", () => {
  const media = [{ id: "media-01" }, { id: "media-02" }];
  assert.equal(viewerIndexFromMediaId(media, "media-02"), 1);
  assert.equal(viewerIndexFromMediaId(media, "not-from-this-album"), null);
  assert.equal(viewerIndexFromMediaId(media, null), null);
});
