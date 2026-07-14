import assert from "node:assert/strict";
import test from "node:test";

import {
  AppFailure,
  classifyDataFailure,
  createProcessingFailure,
  createRequestId,
  createStorageFailure,
  reportAppFailure,
  resolveOptionalRow,
  resolveQueryRows,
  toAppFailure,
} from "../src/lib/app-failure.ts";
import {
  albumDemoFixturesEnabled,
  demoFixturePolicy,
} from "../src/lib/demo-fixtures.ts";

test("album demo fixtures are disabled by default and require an explicit code policy", () => {
  assert.equal(demoFixturePolicy.albums, "disabled");
  assert.equal(albumDemoFixturesEnabled(), false);
  assert.equal(albumDemoFixturesEnabled({ albums: "local_demo" }), true);
});

test("request IDs preserve safe upstream IDs and replace unsafe values", () => {
  assert.equal(createRequestId("request-12345678"), "request-12345678");
  assert.match(createRequestId("short"), /^[0-9a-f-]{36}$/);
  assert.match(createRequestId("token=secret value"), /^[0-9a-f-]{36}$/);
});

test("database schema failures are distinct and safe for users", () => {
  const failure = classifyDataFailure(
    { code: "42P01", message: "relation private_table does not exist" },
    "albums.list",
    "request-schema-123",
  );

  assert.equal(failure.code, "DATABASE_SCHEMA_MISMATCH");
  assert.equal(failure.status, 503);
  assert.equal(failure.retryable, false);
  assert.equal(failure.requestId, "request-schema-123");
  assert.doesNotMatch(failure.publicMessage, /private_table|relation/i);
});

test("authorization and availability failures do not collapse into one state", () => {
  const forbidden = classifyDataFailure({ code: "42501" }, "albums.detail");
  const unavailable = classifyDataFailure(new Error("connection refused"), "albums.list");

  assert.equal(forbidden.code, "AUTHORIZATION_FAILED");
  assert.equal(forbidden.status, 403);
  assert.equal(unavailable.code, "DATABASE_UNAVAILABLE");
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.retryable, true);
});

test("empty query results remain empty while provider failures throw", () => {
  assert.deepEqual(resolveQueryRows(null, null, "albums.list"), []);
  assert.equal(resolveOptionalRow(undefined, null, "albums.detail"), null);
  assert.throws(
    () => resolveQueryRows([], { code: "PGRST000" }, "albums.list"),
    (error) => error instanceof AppFailure && error.code === "DATABASE_UNAVAILABLE",
  );
});

test("generic server errors are not mislabeled as database failures", () => {
  const failure = toAppFailure(new Error("unknown operation failed"), "api.request");
  assert.equal(failure.code, "UNEXPECTED_FAILURE");
  assert.equal(failure.status, 500);
});

test("storage and media processing failures have distinct safe categories", () => {
  const storage = createStorageFailure(new Error("bucket credential detail"), "r2.get_object");
  const processing = createProcessingFailure(new Error("decoder stack detail"), "media.process_image");

  assert.equal(storage.code, "STORAGE_UNAVAILABLE");
  assert.equal(storage.retryable, true);
  assert.equal(processing.code, "PROCESSING_FAILED");
  assert.equal(processing.status, 422);
  assert.doesNotMatch(storage.publicMessage, /credential|bucket/i);
  assert.doesNotMatch(processing.publicMessage, /decoder|stack/i);
});

test("structured failure logging omits raw provider messages and reports once", () => {
  const failure = new AppFailure({
    code: "DATABASE_UNAVAILABLE",
    operation: "albums.list",
    publicMessage: "Temporarily unavailable.",
    status: 503,
    retryable: true,
    requestId: "request-logging-123",
    cause: new Error("secret-token=do-not-log"),
  });
  const original = console.error;
  const logs = [];
  console.error = (value) => logs.push(String(value));
  try {
    reportAppFailure(failure);
    reportAppFailure(failure);
  } finally {
    console.error = original;
  }

  assert.equal(logs.length, 1);
  assert.match(logs[0], /request-logging-123/);
  assert.doesNotMatch(logs[0], /secret-token|do-not-log/);
});
