import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/202607141830_private_album_rls.sql"),
  "utf8",
).toLowerCase();
const rollback = readFileSync(
  join(process.cwd(), "supabase/rollbacks/202607141830_private_album_rls_rollback.sql"),
  "utf8",
).toLowerCase();

test("private album decision helper is server-defined and not anonymous", () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke execute on function public\.can_access_private_album\(uuid\) from anon/);
  assert.match(migration, /grant execute on function public\.can_access_private_album\(uuid\) to authenticated, service_role/);
});

test("private album decision checks blocked and revoked states before fallback access", () => {
  const blocked = migration.indexOf("if current_is_blocked");
  const selectedRevoked = migration.indexOf("if selected_status = 'revoked'");
  const globalRevoked = migration.indexOf("if global_status = 'revoked'");
  const inviteFallback = migration.indexOf("from public.album_invites");
  const requestFallback = migration.indexOf("from public.album_access_requests");
  assert.ok(blocked >= 0 && blocked < selectedRevoked);
  assert.ok(selectedRevoked < globalRevoked);
  assert.ok(globalRevoked < inviteFallback);
  assert.ok(inviteFallback < requestFallback);
});

test("private media and comments policies delegate to one access decision", () => {
  assert.match(migration, /create policy "authorized users read granted private media"/);
  assert.match(migration, /create policy "authorized users read granted private comments"/);
  assert.equal((migration.match(/public\.can_access_private_album\(a\.id\)/g) ?? []).length, 2);
});

test("rollback removes only the additive policies and helper", () => {
  assert.match(rollback, /drop policy if exists "authorized users read granted private comments"/);
  assert.match(rollback, /drop policy if exists "authorized users read granted private media"/);
  assert.match(rollback, /drop function if exists public\.can_access_private_album\(uuid\)/);
  assert.equal(rollback.includes("drop table"), false);
});
