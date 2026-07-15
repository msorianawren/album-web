import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  createTrustedDatabase,
  requireEnv,
} from "../private-media/common.mjs";

const database = createTrustedDatabase();
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const marker = randomUUID();
const password = `${randomBytes(24).toString("base64url")}Aa1!`;
const createdUserIds = [];
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function record(role, expected, actual) {
  results.push({ role, expected, actual, passed: expected === actual });
  assert(expected === actual, `${role} verification failed.`);
}

async function selectFixtureAlbums() {
  const albumsResult = await database
    .from("albums")
    .select("id")
    .eq("status", "private")
    .limit(25);
  if (albumsResult.error) throw albumsResult.error;
  const albumIds = (albumsResult.data ?? []).map((row) => row.id);
  assert(albumIds.length >= 2, "Two private albums are required for authorization verification.");

  const mediaResult = await database
    .from("media")
    .select("id,album_id")
    .in("album_id", albumIds)
    .eq("processing_status", "ready")
    .limit(100);
  if (mediaResult.error) throw mediaResult.error;

  const mediaByAlbum = new Map();
  for (const row of mediaResult.data ?? []) {
    if (!mediaByAlbum.has(row.album_id)) mediaByAlbum.set(row.album_id, row.id);
  }
  const fixtures = [...mediaByAlbum.entries()].slice(0, 2);
  assert(fixtures.length === 2, "Two private albums with ready media are required.");
  return fixtures.map(([albumId, mediaId]) => ({ albumId, mediaId }));
}

async function grantActorId() {
  const profile = await database
    .from("user_profiles")
    .select("user_id")
    .in("role", ["founder", "admin"])
    .eq("is_blocked", false)
    .limit(1)
    .maybeSingle();
  if (profile.error) throw profile.error;
  assert(profile.data?.user_id, "A non-blocked admin or founder is required.");
  return profile.data.user_id;
}

async function createFixtureUser(label, blocked = false) {
  const email = `codex-authz-${label}-${marker}@example.com`;
  const created = await database.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Authorization fixture ${label}` },
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error("Fixture user creation failed.");
  }
  const userId = created.data.user.id;
  createdUserIds.push(userId);

  const profile = await database.from("user_profiles").upsert({
    user_id: userId,
    email,
    display_name: `Authorization fixture ${label}`,
    provider: "email",
    is_blocked: blocked,
    blocked_reason: blocked ? "Ephemeral authorization verification" : null,
    blocked_at: blocked ? new Date().toISOString() : null,
  }, { onConflict: "user_id" });
  if (profile.error) throw profile.error;

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) {
    throw signedIn.error ?? new Error("Fixture sign-in failed.");
  }
  return { userId, email, client };
}

async function insertGrant({ user, actorId, scope, albumId = null, status = "active" }) {
  const revoked = status === "revoked";
  const inserted = await database.from("album_access_grants").insert({
    user_id: user.userId,
    email_normalized: user.email,
    scope,
    album_id: albumId,
    status,
    granted_by: actorId,
    revoked_by: revoked ? actorId : null,
    revoked_at: revoked ? new Date().toISOString() : null,
    note: "Ephemeral pre-merge authorization verification",
  });
  if (inserted.error) throw inserted.error;
}

async function canAccess(client, albumId) {
  const result = await client.rpc("can_access_private_album", { target_album_id: albumId });
  if (result.error) throw result.error;
  return result.data === true;
}

async function canReadMedia(client, mediaId) {
  const result = await client.from("media").select("id").eq("id", mediaId).maybeSingle();
  if (result.error) throw result.error;
  return result.data?.id === mediaId;
}

async function verifyPrivateAccess(user, expectedByFixture, fixtures) {
  for (let index = 0; index < fixtures.length; index += 1) {
    const expected = expectedByFixture[index];
    const fixture = fixtures[index];
    const decision = await canAccess(user.client, fixture.albumId);
    const mediaRead = await canReadMedia(user.client, fixture.mediaId);
    assert(decision === expected, "Authorization decision did not match the expected role.");
    assert(mediaRead === expected, "Media RLS did not match the authorization decision.");
  }
}

async function verifyHelpIsolation(owner, attacker) {
  const created = await owner.client.rpc("create_user_help_thread", {
    p_source: "system",
    p_subject: "Authorization verification",
    p_body: "Ephemeral ownership verification message.",
    p_assistant_intent: null,
  }).single();
  if (created.error || !created.data?.id) throw created.error ?? new Error("Help fixture creation failed.");
  const threadId = created.data.id;

  const ownerAppend = await owner.client.rpc("append_user_help_message", {
    p_thread_id: threadId,
    p_body: "Owner append verification.",
  });
  if (ownerAppend.error) throw ownerAppend.error;

  const attackerThread = await attacker.client
    .from("help_threads")
    .select("id")
    .eq("id", threadId)
    .maybeSingle();
  if (attackerThread.error) throw attackerThread.error;
  assert(attackerThread.data === null, "Cross-user help thread became readable.");

  const attackerMessages = await attacker.client
    .from("help_messages")
    .select("id")
    .eq("thread_id", threadId);
  if (attackerMessages.error) throw attackerMessages.error;
  assert((attackerMessages.data ?? []).length === 0, "Cross-user help messages became readable.");

  const attackerAppend = await attacker.client.rpc("append_user_help_message", {
    p_thread_id: threadId,
    p_body: "Cross-user append must fail.",
  });
  assert(Boolean(attackerAppend.error), "Cross-user help append unexpectedly succeeded.");
  assert(attackerAppend.error?.code === "PT404", "Cross-user help append did not fail closed.");
}

async function cleanup() {
  if (createdUserIds.length === 0) return;
  const threads = await database.from("help_threads").delete().in("owner_user_id", createdUserIds);
  if (threads.error) throw threads.error;
  const grants = await database.from("album_access_grants").delete().in("user_id", createdUserIds);
  if (grants.error) throw grants.error;
  for (const userId of createdUserIds) {
    const deleted = await database.auth.admin.deleteUser(userId);
    if (deleted.error) throw deleted.error;
  }
}

let verificationSummary;
try {
  const fixtures = await selectFixtureAlbums();
  const actorId = await grantActorId();
  const noGrant = await createFixtureUser("no-grant");
  const selected = await createFixtureUser("selected");
  const global = await createFixtureUser("global");
  const revoked = await createFixtureUser("revoked");
  const blocked = await createFixtureUser("blocked", true);

  await insertGrant({ user: selected, actorId, scope: "selected_albums", albumId: fixtures[0].albumId });
  await insertGrant({ user: global, actorId, scope: "all_private" });
  await insertGrant({ user: revoked, actorId, scope: "selected_albums", albumId: fixtures[0].albumId, status: "revoked" });
  await insertGrant({ user: blocked, actorId, scope: "all_private" });

  await verifyPrivateAccess(noGrant, [false, false], fixtures);
  record("no-grant authenticated account", "denied", "denied");
  await verifyPrivateAccess(selected, [true, false], fixtures);
  record("selected-album grant account", "selected-only", "selected-only");
  await verifyPrivateAccess(global, [true, true], fixtures);
  record("all-private grant account", "allowed", "allowed");
  await verifyPrivateAccess(revoked, [false, false], fixtures);
  record("revoked account", "denied", "denied");
  await verifyPrivateAccess(blocked, [false, false], fixtures);
  record("blocked account", "denied", "denied");
  await verifyHelpIsolation(noGrant, selected);
  record("cross-user help-thread attempt", "denied", "denied");

  verificationSummary = {
    verifiedAt: new Date().toISOString(),
    checks: results,
    fixtureUsers: createdUserIds.length,
    cleanup: "complete",
  };
} finally {
  await cleanup();
}

console.log(JSON.stringify(verificationSummary));
