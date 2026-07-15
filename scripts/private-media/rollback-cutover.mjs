import {
  copyObject,
  createStorageClient,
  createTrustedDatabase,
  fetchAll,
  hasFlag,
  headObject,
  privateBucket,
  publicBucket,
  runBounded,
  withRetry,
} from "./common.mjs";

const apply = hasFlag("--apply") && !hasFlag("--dry-run");
const database = createTrustedDatabase();
const storage = createStorageClient();
const destinationBucket = privateBucket();
if (!destinationBucket) throw new Error("R2_PRIVATE_BUCKET_NAME is required for rollback checks.");
const rows = await fetchAll((from, to) =>
  database
    .from("private_media_assets")
    .select("id,legacy_object_key,intended_private_key,source_size")
    .eq("migration_state", "active")
    .eq("bucket_role", "private")
    .order("id", { ascending: true })
    .range(from, to),
);

const restoreByLegacyKey = new Map();
for (const row of rows) {
  if (!restoreByLegacyKey.has(row.legacy_object_key)) restoreByLegacyKey.set(row.legacy_object_key, row);
}
const restoreCandidates = [...restoreByLegacyKey.values()];
let missingLegacySources = 0;

await runBounded(
  restoreCandidates,
  6,
  async (row) => {
    const [source, destination] = await Promise.all([
      withRetry(() => headObject(storage, publicBucket(), row.legacy_object_key)),
      withRetry(() => headObject(storage, destinationBucket, row.intended_private_key)),
    ]);
    if (!destination.exists || destination.size !== row.source_size) {
      throw new Error("Rollback blocked: verified private copy is unavailable.");
    }
    if (source.exists && source.size !== destination.size) {
      throw new Error("Rollback blocked: legacy source size differs from the private copy.");
    }
    return { row, needsRestore: !source.exists, destinationSize: destination.size };
  },
  async (chunk) => {
    missingLegacySources += chunk.filter((item) => item.needsRestore).length;
    if (!apply) return;
    await Promise.all(chunk.map(async ({ row, needsRestore, destinationSize }) => {
      if (!needsRestore) return;
      await withRetry(() => copyObject(
        storage,
        destinationBucket,
        row.intended_private_key,
        publicBucket(),
        row.legacy_object_key,
      ));
      const restored = await withRetry(() => headObject(storage, publicBucket(), row.legacy_object_key));
      if (!restored.exists || restored.size !== destinationSize) {
        throw new Error("Rollback blocked: legacy source restoration failed verification.");
      }
    }));
  },
);

if (!apply) {
  console.log(`Dry run: ${rows.length} active assets would return to authenticated legacy gateway delivery.`);
  console.log(`${missingLegacySources} unique legacy source objects would be restored from verified private copies.`);
  console.log("No manifest rows or R2 objects changed.");
  process.exit(0);
}

for (const row of rows) {
  const { error } = await database
    .from("private_media_assets")
    .update({
      object_key: row.legacy_object_key,
      bucket_role: "public",
      migration_state: "rollback_required",
      activated_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("migration_state", "active");
  if (error) throw error;
}

console.log(`Rollback complete: ${rows.length} assets restored to authenticated legacy gateway delivery.`);
console.log("Copied private objects and legacy source objects were preserved.");
