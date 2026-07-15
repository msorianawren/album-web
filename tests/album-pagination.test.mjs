import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const repository = read("src/lib/albums.ts");
const albumsApi = read("src/app/api/albums/route.ts");
const migration = read("supabase/migrations/202607150100_album_summary_pagination.sql");
const rollback = read("supabase/rollbacks/202607150100_album_summary_pagination_rollback.sql");

test("album browsing uses an opaque cursor RPC instead of loading every album into the client", () => {
  const paginationLayer = repository.slice(
    repository.indexOf("function decodeAlbumCursor"),
    repository.indexOf("export async function getAlbum("),
  );

  assert.match(paginationLayer, /Buffer\.from\(cursor, "base64url"\)/);
  assert.match(paginationLayer, /\.rpc\("list_album_summaries"/);
  assert.match(paginationLayer, /rows\.length > limit/);
  assert.match(paginationLayer, /getAlbumSections/);
  assert.doesNotMatch(paginationLayer, /\.from\("albums"\)\.select\("\*"\)/);
});

test("summary migration keeps manual ordering stable and bounds previews in SQL", () => {
  assert.match(migration, /albums_public_cursor_idx/);
  assert.match(migration, /albums_updating_cursor_idx/);
  assert.match(migration, /albums_private_cursor_idx/);
  assert.match(migration, /order by list_sort_order asc, created_at desc, id asc/i);
  assert.match(migration, /limit least\(greatest\(coalesce\(p_limit, 24\), 1\), 100\) \+ 1/i);
  assert.match(migration, /left join lateral/i);
  assert.match(migration, /limit 4/i);
  assert.match(migration, /processing_status = 'ready'/i);
});

test("private summary payloads return safe previews or gateway IDs, never private media URLs", () => {
  const privateProjection = migration.slice(
    migration.indexOf("when a.status = 'private' then jsonb_build_object"),
    migration.indexOf("else jsonb_build_object"),
  );

  assert.match(privateProjection, /'id', m\.id/);
  assert.match(privateProjection, /'media_type', m\.media_type/);
  assert.doesNotMatch(privateProjection, /thumbnail_url|medium_url|poster_url|'url'/);
  assert.match(migration, /private_album_access_decision\(a\.id\)/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /grant execute.*anon, authenticated, service_role/is);
});

test("browser pagination requires a single status and is never publicly cached", () => {
  assert.match(albumsApi, /A single album status is required for cursor pagination/);
  assert.match(albumsApi, /Cache-Control": "private, no-store/);
});

test("pagination rollback removes only the additive query layer", () => {
  assert.match(rollback, /drop function if exists public\.list_album_summaries/i);
  assert.match(rollback, /drop index if exists public\.albums_public_cursor_idx/i);
  assert.doesNotMatch(rollback, /delete\s+from|update\s+public\.(albums|media)|truncate/i);
});
