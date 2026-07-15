import {
  checkpointDirectory,
  createStorageClient,
  createTrustedDatabase,
  fetchAll,
  hasFlag,
  headObject,
  inventoryPath,
  inventoryReportPath,
  isPubliclyReachable,
  mediaVariants,
  publicBucket,
  readJson,
  runBounded,
  safeErrorCode,
  writeJsonAtomic,
  writeTextAtomic,
} from "./common.mjs";
import { join } from "node:path";

const database = createTrustedDatabase();
const storage = createStorageClient();
const checkpointPath = join(checkpointDirectory, "inventory.json");
const checkpoint = hasFlag("--refresh")
  ? { assets: {} }
  : await readJson(checkpointPath, { assets: {} });

const albums = await fetchAll((from, to) =>
  database
    .from("albums")
    .select("id,title,slug,created_at")
    .eq("status", "private")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .range(from, to),
);

const media = await fetchAll((from, to) =>
  database
    .from("media")
    .select("id,album_id,media_type,mime_type,url,thumbnail_url,medium_url,poster_url,r2_key,public_r2_key,thumbnail_r2_key,medium_r2_key,poster_r2_key,original_private_r2_key,created_at,albums!media_album_id_fkey!inner(status)")
    .eq("albums.status", "private")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .range(from, to),
);

const tasks = media.flatMap((item) =>
  mediaVariants(item).map((asset) => ({
    id: `${item.id}:${asset.variant}`,
    albumId: item.album_id,
    mediaId: item.id,
    mediaType: item.media_type,
    dbUrls: {
      url: item.url || null,
      thumbnailUrl: item.thumbnail_url || null,
      mediumUrl: item.medium_url || null,
      posterUrl: item.poster_url || null,
    },
    dbKeys: {
      r2Key: item.r2_key || null,
      publicR2Key: item.public_r2_key || null,
      thumbnailR2Key: item.thumbnail_r2_key || null,
      mediumR2Key: item.medium_r2_key || null,
      posterR2Key: item.poster_r2_key || null,
      originalPrivateR2Key: item.original_private_r2_key || null,
    },
    ...asset,
  })),
);

const results = { ...(checkpoint.assets || {}) };
const pending = tasks.filter((task) => !results[task.id]);

await runBounded(
  pending,
  4,
  async (task) => {
    try {
      const [head, publiclyReachable] = await Promise.all([
        headObject(storage, publicBucket(), task.currentKey),
        isPubliclyReachable(task.currentKey),
      ]);
      return {
        ...task,
        source: head,
        publiclyReachable,
        migrationStatus: head.exists ? "verified" : "failed",
        failureCode: head.exists ? null : "SOURCE_OBJECT_MISSING",
      };
    } catch (error) {
      return {
        ...task,
        source: { exists: false, contentType: null, size: null, etag: null, checksum: null },
        publiclyReachable: null,
        migrationStatus: "failed",
        failureCode: safeErrorCode(error),
      };
    }
  },
  async (chunk) => {
    for (const asset of chunk) results[asset.id] = asset;
    await writeJsonAtomic(checkpointPath, { updatedAt: new Date().toISOString(), assets: results });
  },
);

const assets = tasks.map((task) => results[task.id]).filter(Boolean);
const inventory = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  containsSensitiveStorageMetadata: true,
  privateAlbums: albums,
  mediaCount: media.length,
  assets,
};
await writeJsonAtomic(inventoryPath, inventory);

const missing = assets.filter((asset) => !asset.source.exists).length;
const publicReachable = assets.filter((asset) => asset.publiclyReachable === true).length;
const unknownReachability = assets.filter((asset) => asset.publiclyReachable === null).length;
const report = `# Private Media Inventory Report

- Generated: ${inventory.generatedAt}
- Private albums: ${albums.length}
- Private media rows: ${media.length}
- Asset variants: ${assets.length}
- Source objects verified: ${assets.length - missing}
- Source objects missing or unreadable: ${missing}
- Publicly reachable through configured R2 domain: ${publicReachable}
- Public reachability unknown: ${unknownReachability}
- Object migration performed: no
- Source deletion performed: no

The detailed JSON is local-only because it contains object keys and legacy URL fields. It is excluded from Git.
`;
await writeTextAtomic(inventoryReportPath, report);

console.log(`Inventory complete: ${albums.length} private albums, ${media.length} media rows, ${assets.length} asset variants.`);
console.log(`Verified source objects: ${assets.length - missing}; missing/unreadable: ${missing}; publicly reachable: ${publicReachable}.`);
