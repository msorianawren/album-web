import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const queue = read("src/hooks/useUploadQueue.ts");
const presign = read("src/app/api/upload/presign/route.ts");
const reservations = read("src/lib/media/processing-jobs.ts");

test("album uploads bound presign waits and allow an in-flight request to be cancelled", () => {
  assert.match(queue, /const PRESIGN_TIMEOUT_MS = 25_000/);
  assert.match(queue, /AbortController/);
  assert.match(queue, /activeRequests\.current\[item\.id\] = presignController/);
  assert.match(queue, /activeRequests\.current\[id\]\?\.abort\(\)/);
  assert.match(queue, /xhr\.timeout = DIRECT_UPLOAD_TIMEOUT_MS/);
  assert.match(queue, /xhr\.ontimeout/);
  assert.match(queue, /const COMPLETION_TIMEOUT_MS = 30_000/);
  assert.match(queue, /\[COMPLETE_TIMEOUT\]/);
  assert.match(presign, /const PRESIGN_TIMEOUT_MS = 20_000/);
  assert.match(presign, /withPresignTimeout/);
});

test("a retry reuses the same server reservation instead of creating duplicate media", () => {
  assert.match(queue, /uploadId: item\.id/);
  assert.match(presign, /idempotencyKey: `upload-presign:\$\{albumId\}:\$\{uploadId\}`/);
  assert.match(reservations, /mediaId = randomUUID\(\)/);
  assert.match(reservations, /idempotencyKey\?: string/);
});
