import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = [
  { directory: ".next/static", extensions: new Set([".js", ".html", ".txt"]) },
  { directory: ".next/server/app", extensions: new Set([".html", ".rsc"]) },
];
const leakPatterns = [
  /https:\/\/[^"'\\\s]+\.r2\.cloudflarestorage\.com\//i,
  /https:\/\/[^"'\\\s]+\/private\/albums\/[0-9a-f-]{36}\//i,
  /X-Amz-Credential=[^&"'\\\s]+/i,
  /X-Amz-Signature=[0-9a-f]{32,}/i,
];
const failures = [];

async function visit(relativeDirectory, extensions) {
  const directory = path.join(process.cwd(), relativeDirectory);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      await visit(relative, extensions);
      continue;
    }
    if (!extensions.has(path.extname(entry.name))) continue;
    const body = await readFile(path.join(process.cwd(), relative), "utf8");
    if (leakPatterns.some((pattern) => pattern.test(body))) failures.push(relative);
  }
}

for (const root of roots) await visit(root.directory, root.extensions);
if (failures.length) {
  throw new Error(
    `Private-media leak gate failed for generated public artifacts:\n- ${failures.join("\n- ")}`,
  );
}
console.log("Private-media leak gate passed.");
