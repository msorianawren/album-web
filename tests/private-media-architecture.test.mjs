import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const gateway = read("src/app/api/media/[id]/content/route.ts");
const repository = read("src/lib/albums.ts");
const boundary = read("src/lib/private-media.ts");
const trustedDelivery = read("src/lib/db/private-media-delivery.ts");
const migration = read("supabase/migrations/202607142330_private_media_manifest.sql");
const rollback = read("supabase/rollbacks/202607142330_private_media_manifest_rollback.sql");

test("private browser payloads use authenticated same-site delivery and redact object keys", () => {
  assert.match(boundary, /\/api\/media\/\$\{encodeURIComponent\(mediaId\)\}\/content/);
  assert.match(boundary, /r2_key: ""/);
  assert.match(boundary, /public_r2_key: null/);
  assert.match(boundary, /original_private_r2_key: null/);
});

test("private album repository selects safe metadata and projects before serialization", () => {
  assert.match(repository, /PRIVATE_MEDIA_SAFE_SELECT/);
  assert.match(repository, /sortedMedia\.map\(projectPrivateMediaForClient\)/);
  assert.match(repository, /projectPrivatePreviewForClient/);
  assert.match(repository, /privateCover\?\.thumbnail_url/);
  assert.match(repository, /cover_url: album\.safe_preview_url \?\? null/);
});

test("gateway authorizes before R2 streaming and never constructs a public URL", () => {
  assert.ok(gateway.indexOf("authorizePrivateMediaAsset") < gateway.indexOf("getR2ObjectStream"));
  assert.doesNotMatch(gateway, /getPublicUrl|R2_PUBLIC_URL|objectKey.*json/i);
  assert.match(gateway, /private, no-store/);
  assert.match(gateway, /Content-Range/);
});

test("trusted manifest lookup is isolated behind the JWT/RLS media decision", () => {
  assert.match(
    boundary,
    /authorizePrivateMediaAsset[\s\S]*createAuthenticatedUserClient\(request\)[\s\S]*getPrivateAssetRecord/,
  );
  assert.match(trustedDelivery, /createTrustedServiceRoleClient/);
  assert.doesNotMatch(gateway, /createTrustedServiceRoleClient|SERVICE_ROLE/);
});

test("private asset manifest is server-only and additive", () => {
  assert.match(migration, /revoke all on table public\.private_media_assets from anon, authenticated/i);
  assert.match(migration, /grant all on table public\.private_media_assets to service_role/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.media|drop\s+table\s+public\.media/i);
  assert.match(migration, /migration_state.*inventory/i);
});

test("private media manifest has a non-R2 rollback", () => {
  assert.match(rollback, /drop table if exists public\.private_media_assets/i);
  assert.doesNotMatch(rollback, /delete\s+from|update\s+public\.media|truncate/i);
});
