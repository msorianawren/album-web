import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/202607142115_user_help_write_rpcs.sql"),
  "utf8",
).toLowerCase();
const rollback = readFileSync(
  join(process.cwd(), "supabase/rollbacks/202607142115_user_help_write_rpcs_rollback.sql"),
  "utf8",
).toLowerCase();

test("help write RPCs use authenticated security-definer boundaries", () => {
  assert.equal((migration.match(/security definer/g) ?? []).length, 2);
  assert.equal((migration.match(/set search_path = ''/g) ?? []).length, 2);
  assert.match(migration, /revoke all on function public\.create_user_help_thread\(text, text, text, text\) from public/);
  assert.match(migration, /revoke all on function public\.create_user_help_thread\(text, text, text, text\) from anon/);
  assert.match(migration, /grant execute on function public\.create_user_help_thread\(text, text, text, text\) to authenticated/);
  assert.match(migration, /revoke all on function public\.append_user_help_message\(uuid, text\) from public/);
  assert.match(migration, /revoke all on function public\.append_user_help_message\(uuid, text\) from anon/);
  assert.match(migration, /grant execute on function public\.append_user_help_message\(uuid, text\) to authenticated/);
});

test("help write RPCs derive identity from auth and reject blocked users", () => {
  assert.equal((migration.match(/current_user_id uuid := auth\.uid\(\)/g) ?? []).length, 2);
  assert.equal((migration.match(/if current_is_blocked then/g) ?? []).length, 2);
  assert.equal(migration.includes("p_owner_user_id"), false);
  assert.equal(migration.includes("p_sender_user_id"), false);
});

test("thread creation keeps the thread, user message, and Companion note atomic", () => {
  const functionStart = migration.indexOf("create or replace function public.create_user_help_thread");
  const appendStart = migration.indexOf("create or replace function public.append_user_help_message");
  const createFunction = migration.slice(functionStart, appendStart);
  assert.match(createFunction, /insert into public\.help_threads/);
  assert.match(createFunction, /insert into public\.help_messages/);
  assert.match(createFunction, /is_internal_note[\s\S]*true/);
  assert.match(createFunction, /jsonb_build_object\('intent', clean_intent\)/);
});

test("message append serializes ownership and the consecutive-message cap", () => {
  const appendFunction = migration.slice(
    migration.indexOf("create or replace function public.append_user_help_message"),
  );
  const lock = appendFunction.indexOf("for update");
  const status = appendFunction.indexOf("target_thread.status in ('closed', 'archived', 'blocked')");
  const cap = appendFunction.indexOf("recent_count = 10 and recent_user_count = recent_count");
  const insert = appendFunction.indexOf("insert into public.help_messages");
  const update = appendFunction.indexOf("update public.help_threads");
  assert.ok(lock >= 0 && lock < status);
  assert.ok(status < cap && cap < insert && insert < update);
  assert.match(appendFunction, /t\.owner_user_id = current_user_id/);
});

test("help RPC rollback removes only the additive functions", () => {
  assert.match(rollback, /drop function if exists public\.append_user_help_message\(uuid, text\)/);
  assert.match(rollback, /drop function if exists public\.create_user_help_thread\(text, text, text, text\)/);
  assert.equal(rollback.includes("drop table"), false);
  assert.equal(rollback.includes("drop policy"), false);
});

test("help RPC failures use fixed public status mappings", () => {
  const service = readFileSync(join(process.cwd(), "src/lib/help-chat.ts"), "utf8");
  for (const [code, status] of [
    ["PT400", 400],
    ["PT401", 401],
    ["PT403", 403],
    ["PT404", 404],
    ["PT409", 409],
    ["PT429", 429],
  ]) {
    assert.match(service, new RegExp(`case "${code}":[\\s\\S]*?status: ${status}`));
  }
  assert.match(service, /default:[\s\S]*status: 503/);
  assert.equal(service.includes("error.message"), false);
});
