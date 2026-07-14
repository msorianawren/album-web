import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { decidePrivateAlbumAccess } from "../src/lib/authorization/role-matrix.ts";

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
