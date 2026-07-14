import {
  checkpointDirectory,
  copyObject,
  createStorageClient,
  createTrustedDatabase,
  hasFlag,
  headObject,
  inventoryPath,
  privateBucket,
  publicBucket,
  readJson,
  runBounded,
  safeErrorCode,
  withRetry,
  writeJsonAtomic,
  writeTextAtomic,
  workspace,
} from "./common.mjs";
import { join } from "node:path";

const apply = hasFlag("--apply") && !hasFlag("--dry-run");
const inventory = await readJson(inventoryPath);
if (!inventory?.assets) throw new Error("Run npm run private-media:inventory first.");

const destinationBucket = privateBucket();
const candidates = inventory.assets.filter((asset) => asset.source.exists);
const reportPath = join(workspace, "PRIVATE_MEDIA_R2_MIGRATION_REPORT.md");

if (!apply) {
  const report = `# Private Media R2 Migration Dry Run

- Generated: ${new Date().toISOString()}
- Candidate assets: ${candidates.length}
- Private bucket configured: ${destinationBucket ? "yes" : "no"}
- Copy performed: no
- Source deletion performed: no
- Next gate: configure a non-public private bucket, apply the manifest, then rerun with \`--apply\`.
`;
  await writeTextAtomic(reportPath, report);
  console.log(`Dry run complete: ${candidates.length} copy candidates; no objects changed.`);
  if (!destinationBucket) console.log("External blocker: R2_PRIVATE_BUCKET_NAME is not configured.");
  process.exit(0);
}

if (!destinationBucket) throw new Error("R2_PRIVATE_BUCKET_NAME is required for --apply.");

const database = createTrustedDatabase();
const storage = createStorageClient();
const checkpointPath = join(checkpointDirectory, "migrate-r2.json");
const checkpoint = await readJson(checkpointPath, { assets: {} });
const results = { ...(checkpoint.assets || {}) };
const pending = candidates.filter((asset) => results[asset.id]?.status !== "cutover_ready");

await runBounded(
  pending,
  3,
  async (asset) => {
    try {
      const source = await withRetry(() => headObject(storage, publicBucket(), asset.currentKey));
      if (!source.exists) throw Object.assign(new Error("Source object missing"), { code: "SOURCE_OBJECT_MISSING" });

      let destination = await withRetry(() => headObject(storage, destinationBucket, asset.intendedPrivateKey));
      if (!destination.exists) {
        await withRetry(() => copyObject(
          storage,
          publicBucket(),
          asset.currentKey,
          destinationBucket,
          asset.intendedPrivateKey,
        ));
        destination = await withRetry(() => headObject(storage, destinationBucket, asset.intendedPrivateKey));
      }

      const checksumMatches = source.checksum && destination.checksum
        ? source.checksum === destination.checksum
        : source.etag && destination.etag
          ? source.etag === destination.etag
          : true;
      const verified = destination.exists && source.size === destination.size && checksumMatches;
      if (!verified) throw Object.assign(new Error("Destination verification failed"), { code: "DESTINATION_VERIFY_FAILED" });

      const { error: copiedError } = await database
        .from("private_media_assets")
        .update({
          migration_state: "copied",
          destination_size: destination.size,
          checksum: destination.checksum || source.checksum,
          etag: destination.etag,
          last_error_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq("media_id", asset.mediaId)
        .eq("variant", asset.variant);
      if (copiedError) throw copiedError;

      const { error: readyError } = await database
        .from("private_media_assets")
        .update({
          migration_state: "cutover_ready",
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("media_id", asset.mediaId)
        .eq("variant", asset.variant);
      if (readyError) throw readyError;

      return { id: asset.id, status: "cutover_ready", size: destination.size };
    } catch (error) {
      const failureCode = safeErrorCode(error);
      await database
        .from("private_media_assets")
        .update({
          migration_state: "failed",
          last_error_code: failureCode,
          updated_at: new Date().toISOString(),
        })
        .eq("media_id", asset.mediaId)
        .eq("variant", asset.variant)
        .neq("migration_state", "active");
      return { id: asset.id, status: "failed", failureCode };
    }
  },
  async (chunk) => {
    for (const result of chunk) results[result.id] = result;
    await writeJsonAtomic(checkpointPath, { updatedAt: new Date().toISOString(), assets: results });
  },
);

const complete = Object.values(results).filter((item) => item.status === "cutover_ready").length;
const failed = Object.values(results).filter((item) => item.status === "failed").length;
await writeTextAtomic(reportPath, `# Private Media R2 Migration Report

- Generated: ${new Date().toISOString()}
- Cutover-ready assets: ${complete}
- Failed assets: ${failed}
- Source deletion performed: no
- Manifest activation performed: no
`);
console.log(`Copy checkpoint complete: ${complete} cutover-ready; ${failed} failed; no source objects deleted.`);
if (failed) process.exitCode = 1;
