import {
  checkpointDirectory,
  createTrustedDatabase,
  hasFlag,
  inventoryPath,
  readJson,
  writeJsonAtomic,
} from "./common.mjs";
import { join } from "node:path";

const apply = hasFlag("--apply");
const inventory = await readJson(inventoryPath);
if (!inventory?.assets) throw new Error("Run npm run private-media:inventory first.");

const rows = inventory.assets.map((asset) => ({
  album_id: asset.albumId,
  media_id: asset.mediaId,
  variant: asset.variant,
  object_key: asset.currentKey,
  legacy_object_key: asset.currentKey,
  intended_private_key: asset.intendedPrivateKey,
  bucket_role: "public",
  mime_type: asset.source.contentType || asset.mimeType,
  migration_state: asset.source.exists ? "verified" : "failed",
  checksum: asset.source.checksum,
  etag: asset.source.etag,
  source_size: asset.source.size,
  last_error_code: asset.failureCode,
  verified_at: asset.source.exists ? new Date().toISOString() : null,
}));

if (!apply) {
  console.log(`Dry run: ${rows.length} manifest rows prepared; no database writes performed.`);
  process.exit(0);
}

const database = createTrustedDatabase();
const checkpointPath = join(checkpointDirectory, "backfill-manifest.json");
const checkpoint = await readJson(checkpointPath, { completed: [] });
const completed = new Set(checkpoint.completed || []);
const pending = rows.filter((row) => !completed.has(`${row.media_id}:${row.variant}`));

for (let start = 0; start < pending.length; start += 100) {
  const batch = pending.slice(start, start + 100);
  const mediaIds = [...new Set(batch.map((row) => row.media_id))];
  const { data: existing, error: existingError } = await database
    .from("private_media_assets")
    .select("media_id,variant,migration_state,bucket_role")
    .in("media_id", mediaIds);
  if (existingError) throw existingError;
  const protectedRows = new Set(
    (existing ?? [])
      .filter((row) =>
        row.bucket_role === "private" ||
        ["copied", "cutover_ready", "active"].includes(row.migration_state),
      )
      .map((row) => `${row.media_id}:${row.variant}`),
  );
  const writable = batch.filter((row) => !protectedRows.has(`${row.media_id}:${row.variant}`));
  if (writable.length) {
    const { error } = await database
      .from("private_media_assets")
      .upsert(writable, { onConflict: "media_id,variant", ignoreDuplicates: false });
    if (error) throw error;
  }
  for (const row of batch) completed.add(`${row.media_id}:${row.variant}`);
  await writeJsonAtomic(checkpointPath, {
    updatedAt: new Date().toISOString(),
    completed: [...completed],
  });
}

console.log(`Manifest backfill complete: ${completed.size} rows checkpointed.`);
