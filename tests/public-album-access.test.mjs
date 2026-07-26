import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("public album detail remains available without a session", () => {
  const source = readFileSync(join(process.cwd(), "src/app/albums/[id]/page.tsx"), "utf8");
  assert.match(source, /if \(album\.status === "private" && !session\?\.userId\)/);
  assert.doesNotMatch(source, /if \(!session\?\.userId\)\s*\{\s*redirect/);
});
