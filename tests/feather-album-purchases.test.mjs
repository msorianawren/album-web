import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/202607171200_feather_album_purchases.sql");
const route = read("src/app/api/albums/[id]/feather-purchase/route.ts");
const lockedState = read("src/components/albums/LockedAlbumState.tsx");
const studioForm = read("src/components/studio/AlbumForm.tsx");
const studioEditor = read("src/components/studio/AlbumEditor.tsx");
const settings = read("src/lib/site-settings.ts");
const decision = read("src/lib/authorization/role-matrix.ts");
const likes = read("src/app/api/likes/route.ts");
const comments = read("src/app/api/comments/route.ts");

test("Feather purchases are permanent per-user entitlements with an auditable debit", () => {
  assert.match(migration, /create table if not exists public\.album_feather_purchases/i);
  assert.match(migration, /unique \(album_id, user_id\)/i);
  assert.match(migration, /create table if not exists public\.wren_feather_ledger/i);
  assert.match(migration, /delta integer not null check \(delta <> 0\)/i);
  assert.match(migration, /'feather_purchase_completed'/i);
  assert.match(migration, /revoke all on table public\.album_feather_purchases, public\.wren_feather_ledger from anon, authenticated/i);
});

test("authorization checks Feather ownership before manual grant revocations", () => {
  const purchase = migration.indexOf("ALLOWED_FEATHER_PURCHASE");
  const selectedRevoke = migration.indexOf("v_selected_status = 'revoked'");
  assert.ok(purchase >= 0 && selectedRevoke >= 0 && purchase < selectedRevoke);
  assert.match(migration, /return 'DENIED_BLOCKED';[\s\S]*return 'ALLOWED_FOUNDER';[\s\S]*ALLOWED_FEATHER_PURCHASE/);
  assert.match(decision, /entitlement === "feather_purchase"[\s\S]*allowed: true/);
});

test("purchase RPC derives actor and price server-side under a locked balance", () => {
  assert.match(migration, /v_user_id uuid := \(select auth\.uid\(\)\)/);
  assert.match(migration, /for update;[\s\S]*select purchase\.id/);
  assert.match(migration, /coalesce\(album\.feather_price, settings\.private_album_default_feather_price\)/);
  assert.match(migration, /profile\.total_feathers >= v_price/);
  assert.match(migration, /insert into public\.album_feather_purchases[\s\S]*update public\.puzzle_user_profiles/);
  assert.match(migration, /v_price not between 1 and 100000/);
  assert.doesNotMatch(migration, /p_price|p_user_id/);
});

test("unlock route has no browser-supplied price or target user", () => {
  assert.match(route, /createAuthenticatedUserClient\(request\)[\s\S]*purchase_private_album_with_feathers/);
  assert.match(route, /target_album_id: parsedParams\.data\.id/);
  assert.doesNotMatch(route, /request\.json\(\)/);
  assert.match(route, /enforceRateLimit/);
  assert.match(route, /revalidatePath/);
});

test("Studio owns pricing controls and locked albums keep request and purchase paths independent", () => {
  for (const source of [studioForm, studioEditor]) {
    assert.match(source, /feather_purchase_enabled/);
    assert.match(source, /feather_price/);
    assert.match(source, /min=\{1\}/);
    assert.match(source, /max=\{100000\}/);
  }
  assert.match(settings, /private_album_default_feather_price: 150/);
  assert.match(settings, /private_album_default_feather_price: z\.number\(\)\.int\(\)\.min\(1\)\.max\(100000\)/);
  assert.match(lockedState, /Request Private Access/);
  assert.match(lockedState, /Unlock for \$\{price\} Feathers/);
  assert.match(lockedState, /album\.access_request_status !== "approved"[\s\S]*canPurchase/);
});

test("protected likes and comments resolve media back to the centrally authorized album", () => {
  assert.match(likes, /resolveLikeAlbumId[\s\S]*\.from\("media"\)[\s\S]*getAlbum\(targetAlbumId/);
  assert.match(likes, /album_id: targetAlbumId/);
  assert.match(comments, /mediaBelongsToAlbum[\s\S]*\.eq\("album_id", albumId\)/);
  assert.match(comments, /mediaBelongsToAlbum\(album\.id, parsed\.data\.mediaId, userClient\)/);
});
