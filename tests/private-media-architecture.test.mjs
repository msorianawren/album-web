import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  selectPrivateMediaManifestSource,
} from "../src/lib/private-media-delivery-policy.ts";
import { isMediaUuid, parseSingleByteRange } from "../src/lib/private-media-range.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const gateway = read("src/app/api/media/[id]/content/route.ts");
const repository = read("src/lib/albums.ts");
const boundary = read("src/lib/private-media.ts");
const trustedDelivery = read("src/lib/db/private-media-delivery.ts");
const migration = read("supabase/migrations/202607142330_private_media_manifest.sql");
const rollback = read("supabase/rollbacks/202607142330_private_media_manifest_rollback.sql");
const inventoryScript = read("scripts/private-media/inventory.mjs");
const backfillScript = read("scripts/private-media/backfill-manifest.mjs");
const copyScript = read("scripts/private-media/migrate-r2.mjs");
const activationScript = read("scripts/private-media/activate.mjs");
const rollbackScript = read("scripts/private-media/rollback-cutover.mjs");

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
  assert.match(repository, /getMediaDeliveryDescriptor\(privateCover/);
  assert.match(repository, /cover_url: album\.safe_preview_url \?\? null/);
});

test("gateway authorizes before R2 streaming and never constructs a public URL", () => {
  assert.ok(gateway.indexOf("authorizePrivateMediaAsset") < gateway.indexOf("streamAuthorizedPrivateMedia"));
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
  assert.match(migration, /private_media_assets_album_id_idx/i);
  assert.match(migration, /private_media_assets_media_id_idx/i);
  assert.match(migration, /private_media_assets_object_key_idx/i);
  assert.match(migration, /unique \(media_id, variant\)/i);
  assert.match(migration, /service role manages private media assets/i);
  assert.match(migration, /migration_state.*discovered/i);
});

test("private media manifest has a non-R2 rollback", () => {
  assert.match(rollback, /drop table if exists public\.private_media_assets/i);
  assert.doesNotMatch(rollback, /delete\s+from|update\s+public\.media|truncate/i);
});

test("dual-read policy activates only verified cutover state and retains legacy fallback", () => {
  const rows = [
    {
      variant: "display",
      object_key: "private/albums/a/m/display/image.webp",
      legacy_object_key: "albums/a/images/m/medium.webp",
      bucket_role: "private",
      mime_type: "image/webp",
      migration_state: "copied",
    },
    {
      variant: "display",
      object_key: "albums/a/images/m/medium.webp",
      legacy_object_key: "albums/a/images/m/medium.webp",
      bucket_role: "public",
      mime_type: "image/webp",
      migration_state: "verified",
    },
  ];
  assert.equal(selectPrivateMediaManifestSource(rows, ["display"])?.bucketRole, "public");
  rows[0].migration_state = "active";
  assert.deepEqual(selectPrivateMediaManifestSource(rows, ["display"]), {
    objectKey: "private/albums/a/m/display/image.webp",
    bucketRole: "private",
    contentType: "image/webp",
    fallbackObjectKey: "albums/a/images/m/medium.webp",
  });
});

test("single byte range parser accepts valid video ranges and rejects malformed or multi ranges", () => {
  assert.equal(parseSingleByteRange(null), undefined);
  assert.equal(parseSingleByteRange("bytes=0-1023"), "bytes=0-1023");
  assert.equal(parseSingleByteRange("bytes=1024-"), "bytes=1024-");
  assert.equal(parseSingleByteRange("bytes=-512"), "bytes=-512");
  assert.equal(parseSingleByteRange("bytes=-"), null);
  assert.equal(parseSingleByteRange("bytes=0-1,4-5"), null);
});

test("gateway validates media identifiers and authenticates before evaluating Range", () => {
  assert.equal(isMediaUuid("00000000-0000-4000-8000-000000000000"), true);
  assert.equal(isMediaUuid("../private/object"), false);
  assert.match(
    gateway,
    /const asset = await authorizePrivateMediaAsset\(request[\s\S]*const range = parseSingleByteRange/,
  );
});

test("private ZIP and single download recheck centralized media authorization", () => {
  const zip = read("src/app/api/albums/[id]/download/route.ts");
  const single = read("src/app/api/media/[id]/download/route.ts");
  assert.match(zip, /authorizePrivateMediaAsset\(request, image\.id/);
  assert.match(zip, /readAuthorizedPrivateMedia/);
  assert.match(single, /authorizePrivateMediaAsset\(request, media\.id/);
  assert.match(single, /streamAuthorizedPrivateMedia/);
});

test("migration commands are dry-run by default, resumable, and never delete source objects", () => {
  assert.match(inventoryScript, /inventoryPath/);
  assert.match(inventoryScript, /containsSensitiveStorageMetadata: true/);
  assert.match(backfillScript, /const apply = hasFlag\("--apply"\)/);
  assert.match(backfillScript, /onConflict: "media_id,variant"/);
  assert.match(copyScript, /const apply = hasFlag\("--apply"\) && !hasFlag\("--dry-run"\)/);
  assert.match(copyScript, /runBounded/);
  assert.match(copyScript, /withRetry/);
  assert.doesNotMatch(copyScript, /DeleteObject|deleteObject|deleteObjects/);
});

test("activation requires cutover-ready rows and rollback preserves both object copies", () => {
  assert.match(activationScript, /migration_state", "cutover_ready"/);
  assert.match(activationScript, /bucket_role: "private"/);
  assert.match(rollbackScript, /migration_state: "rollback_required"/);
  assert.match(rollbackScript, /Copied private objects and legacy source objects were preserved/);
  assert.doesNotMatch(`${activationScript}\n${rollbackScript}`, /DeleteObject|deleteObject|deleteObjects/);
});
