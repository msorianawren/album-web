import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("public album search UI and its dedicated endpoint are removed", () => {
  const publicUi = [
    "src/components/AppHeader.tsx",
    "src/components/PublicMobileNav.tsx",
    "src/components/albums/AlbumList.tsx",
  ].map(read).join("\n");

  for (const removed of ["app-header-search", "mobile-nav-search", "album-list-search", "Search albums", 'name="q"']) {
    assert.equal(publicUi.includes(removed), false, removed);
  }
  assert.equal(existsSync(join(process.cwd(), "src/app/api/search/route.ts")), false);
  assert.equal(read("src/proxy.ts").includes('pathname.startsWith("/api/search")'), false);
});

test("legacy /albums?q URLs are accepted but q is discarded before data access", () => {
  const validators = read("src/lib/validators.ts");
  const albumFilters = validators.slice(validators.indexOf("export const albumFiltersSchema"), validators.indexOf("const puzzleTargetsSchema"));
  assert.equal(albumFilters.includes("q:"), false);
  assert.match(albumFilters, /status: z\.enum\(albumStatuses\)\.optional\(\)/);
  assert.match(read("src/app/albums/page.tsx"), /albumPageQuerySchema\.safeParse\(filters\)/);

  const albums = read("src/lib/albums.ts");
  const browseLayer = albums.slice(albums.indexOf("export async function getAlbumPage"), albums.indexOf("export async function getAlbumMetadata"));
  assert.equal(browseLayer.includes("query.q"), false);
  assert.equal(browseLayer.includes(".ilike"), false);
  assert.match(browseLayer, /p_query:\s*null/);
});

test("search-only album translations are removed while Studio search remains independent", () => {
  for (const locale of ["de", "en", "es", "fr", "id", "ja", "ko", "th", "vi", "zh"]) {
    assert.equal(read(`src/dictionaries/${locale}.json`).includes("search_placeholder"), false, locale);
  }
  assert.match(read("src/components/studio/StudioTopbar.tsx"), /Search albums/);
});
