import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  MediaQuarantineError,
  validateAndProcessImage,
} from "../src/lib/media/image-processing-core.ts";

const settings = {
  max_image_pixels: 36_000_000,
  max_image_dimension: 20_000,
  preserve_image_capture_date: false,
  generate_avif_derivatives: false,
  enable_media_watermark: false,
  watermark_text: null,
};

test("image processor validates bytes and produces deterministic clean derivatives", async () => {
  const source = await sharp({
    create: { width: 120, height: 80, channels: 3, background: { r: 170, g: 80, b: 40 } },
  }).png().withMetadata({ orientation: 6 }).toBuffer();
  const result = await validateAndProcessImage(source, "image/png", settings);
  assert.equal(result.width, 80);
  assert.equal(result.height, 120);
  assert.equal(result.orientation, "portrait");
  assert.equal(result.variants.length, 3);
  assert.deepEqual(result.variants.map((item) => item.name), ["thumbnail", "medium", "large"]);
  assert.ok(result.variants.every((item) => item.webp.length > 0 && item.avif === null));
  assert.match(result.contentHash, /^[a-f0-9]{64}$/);
  assert.ok(result.blurhash.length > 10);
  assert.equal(result.takenAt, null);
  const output = await sharp(result.variants[0].webp).metadata();
  assert.equal(output.format, "webp");
  assert.equal(output.exif, undefined);
});

test("image processor quarantines MIME and dimension mismatches", async () => {
  const source = await sharp({
    create: { width: 40, height: 30, channels: 3, background: "white" },
  }).jpeg().toBuffer();
  await assert.rejects(
    validateAndProcessImage(source, "image/png", settings),
    (error) => error instanceof MediaQuarantineError && error.code === "IMAGE_MAGIC_MISMATCH",
  );
  await assert.rejects(
    validateAndProcessImage(source, "image/jpeg", { ...settings, max_image_dimension: 20 }),
    (error) => error instanceof MediaQuarantineError && error.code === "IMAGE_DIMENSION_LIMIT",
  );
});

test("AVIF derivatives are generated only when explicitly enabled", async () => {
  const source = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#6f7f91" },
  }).webp().toBuffer();
  const result = await validateAndProcessImage(source, "image/webp", {
    ...settings,
    generate_avif_derivatives: true,
  });
  assert.ok(result.variants.every((item) => item.avif && item.avif.length > 0));
  assert.equal((await sharp(result.variants[0].avif).metadata()).format, "heif");
});

test("async processing migration and routes keep sources private and unfinished media unpublished", () => {
  const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
  const migration = read("supabase/migrations/202607150000_async_image_processing.sql");
  const presign = read("src/app/api/upload/presign/route.ts");
  const completion = read("src/app/api/upload/complete/route.ts");
  const worker = read("src/app/api/cron/process-media/route.ts");
  const orphanCleanup = read("scripts/media-processing/orphan-cleanup.mjs");
  for (const state of ["uploaded", "queued", "processing", "ready", "failed", "quarantined", "deleting", "deleted"]) {
    assert.match(migration, new RegExp(`'${state}'`));
  }
  assert.match(migration, /processing_status = 'ready'.*deleted_at is null/s);
  assert.match(migration, /revoke all on table public\.media_processing_jobs from anon, authenticated/);
  assert.match(migration, /for update skip locked/i);
  assert.match(presign, /bucketRole: "private"/);
  assert.doesNotMatch(presign, /sourceKey:\s*reservation\.sourceKey/);
  assert.match(completion, /verifyAndQueueImageUpload/);
  assert.match(worker, /getTrustedWorkerDatabase\(request, "media-processing"\)/);
  assert.doesNotMatch(orphanCleanup, /DeleteObject|deleteR2|\.delete\(/);
  assert.match(orphanCleanup, /No R2 object was deleted/);
});
