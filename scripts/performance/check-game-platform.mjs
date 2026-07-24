import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const failures = [];
const budgets = JSON.parse(
  await readFile(path.join(root, "scripts/performance/budgets.json"), "utf8"),
);
const page = await readFile(path.join(root, "src/app/games/page.tsx"), "utf8");
const catalog = await readFile(path.join(root, "src/games/catalog.ts"), "utf8");
const loaders = await readFile(path.join(root, "src/games/loaders.client.ts"), "utf8");

if (/games\/engines|loaders\.client/.test(page)) {
  failures.push("/games must not statically import generic game engines or client loaders");
}
if (/components\/games|loaders\.client|dynamic\(/.test(catalog)) {
  failures.push("server catalog imports a client or engine module");
}
for (const slug of [...catalog.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1])) {
  const expression = new RegExp(`"${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:\\s*\\(\\)\\s*=>\\s*import\\(`);
  if (!expression.test(loaders)) failures.push(`${slug} is missing its own dynamic client import`);
}

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(file);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs)$/.test(entry.name)) continue;
    const body = await readFile(file, "utf8");
    if (/from\s+["'](?:three|@react-three\/)/.test(body)) failures.push(`${file} imports Three.js`);
    if (/R2_(?:SECRET|ACCESS)|SUPABASE_SERVICE_ROLE_KEY|X-Amz-Signature|r2\.cloudflarestorage\.com/.test(body)) {
      failures.push(`${file} contains a private-media or server-credential marker`);
    }
  }
}

await visit(path.join(root, "src/games"));

const engineDirectory = path.join(root, "src/games/engines");
try {
  for (const entry of await readdir(engineDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let total = 0;
    const sourceParts = [];
    const queue = [path.join(engineDirectory, entry.name)];
    while (queue.length) {
      const current = queue.pop();
      for (const child of await readdir(current, { withFileTypes: true })) {
        const childPath = path.join(current, child.name);
        if (child.isDirectory()) queue.push(childPath);
        else {
          total += (await stat(childPath)).size;
          if (/\.(ts|tsx|js|mjs)$/.test(child.name)) sourceParts.push(await readFile(childPath));
        }
      }
    }
    if (total > budgets.gamePlatform.maxEngineSourceBytes) {
      failures.push(`${entry.name} engine source exceeds ${budgets.gamePlatform.maxEngineSourceBytes} bytes`);
    }
    const engineBudget = budgets.gamePlatform.engines?.[entry.name];
    if (engineBudget) {
      const gzipBytes = gzipSync(Buffer.concat(sourceParts)).byteLength;
      if (gzipBytes > engineBudget.maxGzipBytes) {
        failures.push(`${entry.name} engine source is ${gzipBytes} gzip bytes, over ${engineBudget.maxGzipBytes}`);
      }
    }
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const assetDirectory = path.join(root, "public/games");
try {
  const totals = new Map();
  const queue = [assetDirectory];
  while (queue.length) {
    const current = queue.pop();
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const assetPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(assetPath);
        continue;
      }
      const bytes = (await stat(assetPath)).size;
      const relative = path.relative(assetDirectory, assetPath);
      const slug = relative.split(path.sep)[0];
      totals.set(slug, (totals.get(slug) ?? 0) + bytes);
      if (bytes > budgets.gamePlatform.maxAssetBytes) {
        failures.push(`${path.relative(root, assetPath)} exceeds the per-asset budget`);
      }
    }
  }
  for (const [slug, bytes] of totals) {
    const maximum = budgets.gamePlatform.engines?.[slug]?.maxAssetBytes
      ?? budgets.gamePlatform.maxTotalAssetBytes;
    if (bytes > maximum) failures.push(`public/games/${slug} assets exceed ${maximum} bytes`);
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

if (failures.length) throw new Error(`Game platform gate failed:\n- ${failures.join("\n- ")}`);
console.log("Game platform import, security, and source-budget gates passed.");
