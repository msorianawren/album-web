import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const budgets = JSON.parse(
  await readFile(path.join(root, "scripts/performance/budgets.json"), "utf8"),
);
const forbiddenPackages = [
  "node_modules/sharp",
  "node_modules/exifr",
  "node_modules/jszip",
  "node_modules/@aws-sdk",
  "node_modules/nodemailer",
];

function extractManifest(source) {
  const marker = source.indexOf(" = {");
  if (marker < 0) throw new Error("Client reference manifest is malformed.");
  const start = source.indexOf("{", marker);
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error("Client reference manifest JSON was not closed.");
}

async function routeSize(route) {
  const source = await readFile(path.join(root, route.manifest), "utf8");
  const manifest = extractManifest(source);
  const chunks = new Set(manifest.entryJSFiles?.[route.entry] ?? []);
  let bytes = 0;
  for (const chunk of chunks) {
    bytes += (await stat(path.join(root, ".next", chunk))).size;
  }
  return { bytes, chunks: [...chunks] };
}

const failures = [];
for (const [name, route] of Object.entries(budgets.routes)) {
  const result = await routeSize(route);
  const kib = Math.round(result.bytes / 1024);
  console.log(`${name}: ${kib} KiB across ${result.chunks.length} entry chunks`);
  if (result.bytes > route.maxBytes) {
    failures.push(`${name} is ${result.bytes - route.maxBytes} bytes over budget`);
  }
  for (const chunk of result.chunks) {
    const body = await readFile(path.join(root, ".next", chunk), "utf8");
    const forbidden = forbiddenPackages.find((item) => body.includes(item));
    if (forbidden) failures.push(`${name} client chunk ${chunk} contains ${forbidden}`);
  }
}

if (failures.length) {
  throw new Error(`Client bundle gate failed:\n- ${failures.join("\n- ")}`);
}
