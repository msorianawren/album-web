import {
  createStorageClient,
  createTrustedDatabase,
  fetchAll,
  hasFlag,
  headObject,
  privateBucket,
  publicBucket,
} from "./common.mjs";

const apply = hasFlag("--apply") && !hasFlag("--dry-run");
if (apply && !hasFlag("--acknowledge-public-source-remains")) {
  throw new Error("Activation requires --acknowledge-public-source-remains until direct public delivery is externally blocked.");
}
const destinationBucket = privateBucket();
if (!destinationBucket) throw new Error("R2_PRIVATE_BUCKET_NAME is required for activation checks.");

const database = createTrustedDatabase();
const storage = createStorageClient();
const allRows = await fetchAll((from, to) =>
  database
    .from("private_media_assets")
    .select("id,migration_state")
    .order("id", { ascending: true })
    .range(from, to),
);
const blockers = allRows.filter((row) => !["cutover_ready", "active"].includes(row.migration_state));
if (blockers.length) {
  throw new Error(`Activation blocked: ${blockers.length} manifest assets are not cutover-ready.`);
}
const rows = await fetchAll((from, to) =>
  database
    .from("private_media_assets")
    .select("id,object_key,legacy_object_key,intended_private_key,migration_state,bucket_role,source_size,destination_size")
    .eq("migration_state", "cutover_ready")
    .eq("bucket_role", "public")
    .order("id", { ascending: true })
    .range(from, to),
);

const verified = [];
for (const row of rows) {
  const [source, destination] = await Promise.all([
    headObject(storage, publicBucket(), row.legacy_object_key),
    headObject(storage, destinationBucket, row.intended_private_key),
  ]);
  if (!source.exists || !destination.exists || source.size !== destination.size) {
    throw new Error("Activation preflight failed; source or verified private copy is unavailable.");
  }
  verified.push(row);
}

if (!apply) {
  console.log(`Dry run: ${verified.length} cutover-ready assets verified; no manifest rows activated.`);
  process.exit(0);
}

for (let start = 0; start < verified.length; start += 100) {
  const ids = verified.slice(start, start + 100).map((row) => row.id);
  const activatedAt = new Date().toISOString();
  const { error } = await database
    .from("private_media_assets")
    .update({
      bucket_role: "private",
      migration_state: "active",
      activated_at: activatedAt,
      updated_at: activatedAt,
    })
    .in("id", ids);
  if (error) throw error;

  for (const row of verified.slice(start, start + 100)) {
    const { error: keyError } = await database
      .from("private_media_assets")
      .update({ object_key: row.intended_private_key })
      .eq("id", row.id)
      .eq("migration_state", "active");
    if (keyError) throw keyError;
  }
}

console.log(`Activation complete: ${verified.length} assets now prefer the private bucket; legacy sources remain intact.`);
