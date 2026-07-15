import {
  checkpointDirectory,
  createStorageClient,
  createTrustedDatabase,
  deleteObject,
  fetchAll,
  hasFlag,
  headObject,
  isPubliclyReachable,
  privateBucket,
  publicBaseUrl,
  publicBucket,
  readJson,
  runBounded,
  withRetry,
  writeJsonAtomic,
} from "./common.mjs";
import { join } from "node:path";

const apply = hasFlag("--apply") && !hasFlag("--dry-run");
if (apply && !hasFlag("--acknowledge-reversible-retirement")) {
  throw new Error("Retirement requires --acknowledge-reversible-retirement after rollback restoration is verified.");
}

const database = createTrustedDatabase();
const storage = createStorageClient();
const destinationBucket = privateBucket();
if (!destinationBucket) throw new Error("R2_PRIVATE_BUCKET_NAME is required.");

function publicObjectKey(value) {
  if (!value) return null;
  const base = publicBaseUrl();
  if (!base) return null;
  try {
    const root = new URL(`${base.replace(/\/$/, "")}/`);
    const candidate = new URL(value, root);
    if (candidate.origin !== root.origin || !candidate.pathname.startsWith(root.pathname)) return null;
    return decodeURIComponent(candidate.pathname.slice(root.pathname.length)).replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

const manifestRows = await fetchAll((from, to) =>
  database
    .from("private_media_assets")
    .select("id,legacy_object_key,intended_private_key,source_size")
    .eq("migration_state", "active")
    .eq("bucket_role", "private")
    .order("id", { ascending: true })
    .range(from, to),
);
if (!manifestRows.length) throw new Error("No active private manifest rows are available for retirement.");

const publicMedia = await fetchAll((from, to) =>
  database
    .from("media")
    .select("r2_key,public_r2_key,thumbnail_r2_key,medium_r2_key,poster_r2_key,original_private_r2_key,albums!media_album_id_fkey!inner(status)")
    .neq("albums.status", "private")
    .is("deleted_at", null)
    .range(from, to),
);
const albums = await fetchAll((from, to) =>
  database
    .from("albums")
    .select("status,cover_url")
    .is("deleted_at", null)
    .range(from, to),
);
const protectedKeys = new Set(
  [
    ...publicMedia.flatMap((row) => [
      row.r2_key,
      row.public_r2_key,
      row.thumbnail_r2_key,
      row.medium_r2_key,
      row.poster_r2_key,
      row.original_private_r2_key,
    ]),
    ...albums.flatMap((album) => [
      album.status === "private" ? null : publicObjectKey(album.cover_url),
    ]),
  ].filter(Boolean),
);

const grouped = new Map();
for (const row of manifestRows) {
  if (!grouped.has(row.legacy_object_key)) grouped.set(row.legacy_object_key, row);
}
const candidates = [...grouped.values()];
const shared = candidates.filter((row) => protectedKeys.has(row.legacy_object_key));
if (shared.length) {
  throw new Error(`Retirement blocked: ${shared.length} legacy objects are still referenced by non-private media.`);
}

const checkpointPath = join(checkpointDirectory, "retire-public-sources.json");
const checkpoint = await readJson(checkpointPath, { objects: {} });
const results = { ...(checkpoint.objects || {}) };
let verified = 0;
let alreadyRetired = 0;

await runBounded(
  candidates,
  6,
  async (row) => {
    const [source, destination] = await Promise.all([
      withRetry(() => headObject(storage, publicBucket(), row.legacy_object_key)),
      withRetry(() => headObject(storage, destinationBucket, row.intended_private_key)),
    ]);
    if (!destination.exists || destination.size !== row.source_size) {
      throw new Error("Retirement blocked: private destination failed size verification.");
    }
    if (source.exists && source.size !== destination.size) {
      throw new Error("Retirement blocked: public source differs from its private copy.");
    }
    return { row, sourceExists: source.exists };
  },
  async (chunk) => {
    verified += chunk.length;
    alreadyRetired += chunk.filter((item) => !item.sourceExists).length;
    if (!apply) return;

    for (const { row, sourceExists } of chunk) {
      if (sourceExists) {
        await withRetry(() => deleteObject(storage, publicBucket(), row.legacy_object_key));
      }
      const origin = await withRetry(() => headObject(storage, publicBucket(), row.legacy_object_key));
      if (origin.exists) throw new Error("Retirement failed: public source still exists.");
      const publiclyReachable = await isPubliclyReachable(row.legacy_object_key);
      results[row.legacy_object_key] = {
        status: publiclyReachable === true ? "origin_retired_cache_reachable" : "retired",
        checkedAt: new Date().toISOString(),
      };
    }
    await writeJsonAtomic(checkpointPath, { updatedAt: new Date().toISOString(), objects: results });
  },
);

if (!apply) {
  console.log(`Dry run: ${verified} unique legacy objects verified; ${alreadyRetired} already absent.`);
  console.log("No R2 object or manifest row changed.");
  process.exit(0);
}

const cacheReachable = Object.values(results).filter((item) => item.status === "origin_retired_cache_reachable").length;
console.log(`Retirement complete: ${verified} unique public sources absent at origin; ${cacheReachable} still reachable through public cache.`);
if (cacheReachable) process.exitCode = 1;
