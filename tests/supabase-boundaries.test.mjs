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
