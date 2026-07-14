import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { decidePrivateAlbumAccess } from "../src/lib/authorization/role-matrix.ts";
import { isValidWorkerAuthorization } from "../src/lib/authorization/worker-secret.ts";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("public and authenticated-user clients cannot access the service-role key", () => {
  for (const path of ["src/lib/db/public.ts", "src/lib/db/user.ts"]) {
    const source = read(path);
    assert.equal(source.includes("SUPABASE_SERVICE_ROLE_KEY"), false, path);
    assert.equal(source.includes("trusted-service"), false, path);
    assert.equal(source.includes("@/lib/supabase"), false, path);
  }
});

test("trusted service-role constructor has only explicit admin and worker importers", () => {
  const allowed = new Set(["src/lib/db/admin.ts", "src/lib/db/worker.ts"]);
  const candidates = [
    "src/lib/db/public.ts",
    "src/lib/db/user.ts",
    "src/lib/db/admin.ts",
    "src/lib/db/worker.ts",
  ];
  const importers = candidates.filter((path) => read(path).includes("@/lib/db/trusted-service"));
  assert.deepEqual(new Set(importers), allowed);
});

test("album repository uses the anon client for public album and media reads", () => {
  const source = read("src/lib/albums.ts");
  assert.match(source, /let builder = publicClient\s*\.from\("albums"\)/);
  assert.match(source, /let albumQuery = publicClient\s*\.from\("albums"\)/);
  assert.match(source, /album\.status === "private" \? supabase : publicClient/);
  assert.match(source, /getPreviewRows\(publicClient, publicAlbumIds/);
});

test("album admin mutations use a guarded trusted database instead of the broad client", () => {
  for (const path of [
    "src/app/api/albums/route.ts",
    "src/app/api/albums/[id]/route.ts",
    "src/app/api/albums/[id]/images/route.ts",
    "src/app/api/studio/albums/reorder/route.ts",
  ]) {
    const source = read(path);
    assert.equal(source.includes("@/lib/supabase"), false, path);
    assert.equal(source.includes("getTrustedAdminDatabase"), true, path);
  }
});

test("comment moderation uses guarded admin clients and public comment reads use RLS", () => {
  const collectionRoute = read("src/app/api/comments/route.ts");
  const itemRoute = read("src/app/api/comments/[id]/route.ts");
  assert.equal(collectionRoute.includes("createPublicServerClient()"), true);
  assert.equal(collectionRoute.includes("database?.client ?? createPublicServerClient()"), true);
  assert.equal(collectionRoute.includes("getTrustedAdminDatabase(request)"), true);
  assert.equal(itemRoute.includes("@/lib/supabase"), false);
  assert.equal(itemRoute.includes("getTrustedAdminDatabase(request)"), true);
  assert.equal(itemRoute.includes("commentIdSchema.safeParse"), true);
});

test("founder audit and user block routes construct trusted clients only after guards", () => {
  const auditRoute = read("src/app/api/admin/audit-logs/route.ts");
  const userRoute = read("src/app/api/admin/users/[id]/route.ts");
  assert.equal(auditRoute.includes("@/lib/supabase"), false);
  assert.equal(auditRoute.includes("getTrustedFounderDatabase(request)"), true);
  assert.equal(auditRoute.includes("Math.min(100"), true);
  assert.equal(userRoute.includes("@/lib/supabase"), false);
  assert.equal(userRoute.includes("@/lib/role-management"), false);
  assert.equal(userRoute.includes("getTrustedAdminDatabase(request)"), true);
  assert.equal(userRoute.includes("z.boolean()"), true);
  assert.equal(userRoute.includes("Boolean(body.is_blocked)"), false);
});

test("role management requires an explicit client and Founder routes pass guarded clients", () => {
  const repository = read("src/lib/role-management.ts");
  const listRoute = read("src/app/api/admin/users/route.ts");
  const grantRoute = read("src/app/api/admin/users/[id]/grant-admin/route.ts");
  const revokeRoute = read("src/app/api/admin/users/[id]/revoke-admin/route.ts");
  assert.equal(repository.includes("@/lib/supabase"), false);
  assert.match(repository, /listAdminUsers\(client: SupabaseClient/);
  assert.match(repository, /getAdminProfile\(client: SupabaseClient/);
  for (const source of [listRoute, grantRoute, revokeRoute]) {
    assert.equal(source.includes("getTrustedFounderDatabase(request)"), true);
    assert.equal(source.includes("database.client"), true);
  }
});

test("cron routes require a trusted worker database and do not import the broad client", () => {
  for (const path of [
    "src/app/api/cron/prune-logs/route.ts",
    "src/app/api/cron/auto-approve-access-requests/route.ts",
  ]) {
    const source = read(path);
    assert.equal(source.includes("@/lib/supabase"), false, path);
    assert.equal(source.includes("getTrustedWorkerDatabase"), true, path);
    assert.equal(source.includes("VERCEL_ENV"), false, path);
  }
});

test("worker authorization fails closed and accepts only an exact bearer secret", () => {
  assert.equal(isValidWorkerAuthorization(null, "secret"), false);
  assert.equal(isValidWorkerAuthorization("Bearer secret", undefined), false);
  assert.equal(isValidWorkerAuthorization("Bearer secret-extra", "secret"), false);
  assert.equal(isValidWorkerAuthorization("bearer secret", "secret"), false);
  assert.equal(isValidWorkerAuthorization("Bearer secret", "secret"), true);
});

test("notification routes use request-scoped JWT clients and never the broad client", () => {
  for (const path of [
    "src/app/api/notifications/route.ts",
    "src/app/api/notifications/[id]/route.ts",
  ]) {
    const source = read(path);
    assert.equal(source.includes("@/lib/supabase"), false, path);
    assert.equal(source.includes("createAuthenticatedUserClient(request)"), true, path);
    assert.equal(source.includes("recipient_user_id"), true, path);
    assert.equal(source.includes("session.userId"), true, path);
  }
});

test("user help reads and writes pass a request-scoped JWT client into the conversation service", () => {
  const listRoute = read("src/app/api/help/threads/route.ts");
  const detailRoute = read("src/app/api/help/threads/[id]/messages/route.ts");
  const service = read("src/lib/help-chat.ts");
  assert.equal(listRoute.includes("listUserHelpThreads(session, client, page)"), true);
  assert.equal(detailRoute.includes("getUserHelpThread(session, client"), true);
  assert.equal(listRoute.includes("createHelpThread({ session, client"), true);
  assert.equal(detailRoute.includes("appendUserHelpMessage({ session, client"), true);
  assert.match(service, /listUserHelpThreads\([\s\S]*client: SupabaseClient/);
  assert.match(service, /getUserHelpThread\([\s\S]*client: SupabaseClient/);
  assert.match(service, /client\s*\.rpc\("create_user_help_thread"/);
  assert.match(service, /client\s*\.rpc\("append_user_help_message"/);
  const userWriteSection = service.slice(
    service.indexOf("export async function createHelpThread"),
    service.indexOf("export async function listAdminHelpThreads"),
  );
  assert.equal(userWriteSection.includes('.from("help_threads").insert'), false);
  assert.equal(userWriteSection.includes('.from("help_messages").insert'), false);
  assert.equal(userWriteSection.includes('.from("help_threads").update'), false);
  assert.equal(service.includes('row.sender_type === "admin" ? "Oriana Wren"'), true);
});

test("private album role matrix denies untrusted and revoked principals", () => {
  assert.deepEqual(decidePrivateAlbumAccess("anonymous", "all_private"), {
    allowed: false,
    reason: "anonymous",
  });
  assert.deepEqual(decidePrivateAlbumAccess("blocked", "selected_album"), {
    allowed: false,
    reason: "blocked",
  });
  assert.deepEqual(decidePrivateAlbumAccess("authenticated", "revoked"), {
    allowed: false,
    reason: "revoked",
  });
});

test("private album role matrix grants only explicit user or trusted access", () => {
  assert.equal(decidePrivateAlbumAccess("authenticated", "none").allowed, false);
  assert.equal(decidePrivateAlbumAccess("authenticated", "selected_album").allowed, true);
  assert.equal(decidePrivateAlbumAccess("authenticated", "all_private").allowed, true);
  assert.equal(decidePrivateAlbumAccess("admin", "revoked").allowed, true);
  assert.equal(decidePrivateAlbumAccess("founder", "none").allowed, true);
  assert.equal(decidePrivateAlbumAccess("worker", "none").allowed, true);
});
