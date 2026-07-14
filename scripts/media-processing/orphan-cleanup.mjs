import {
  createStorageClient,
  createTrustedDatabase,
  getOption,
  hasFlag,
  headObject,
  privateBucket,
} from "../private-media/common.mjs";

const apply = hasFlag("--apply");
const ageHours = Math.max(1, Number(getOption("--age-hours", "24")));
const limit = Math.max(1, Math.min(Number(getOption("--limit", "100")), 500));
const database = createTrustedDatabase();
const bucket = privateBucket();
if (!bucket) throw new Error("R2_PRIVATE_BUCKET_NAME is required.");
const storage = createStorageClient();
const cutoff = new Date(Date.now() - ageHours * 60 * 60 * 1000).toISOString();

const { data, error } = await database
  .from("media_processing_jobs")
  .select("media_id,state,source_object_key,updated_at")
  .in("state", ["uploaded", "failed", "quarantined"])
  .lt("updated_at", cutoff)
  .order("updated_at", { ascending: true })
  .limit(limit);
if (error) throw error;

const candidates = [];
for (const row of data ?? []) {
  const source = await headObject(storage, bucket, row.source_object_key);
  candidates.push({ mediaId: row.media_id, state: row.state, sourceExists: source.exists, sourceSize: source.size });
  if (apply) {
    const marked = await database.rpc("mark_media_processing_orphan", { target_media_id: row.media_id });
    if (marked.error) throw marked.error;
  }
}

console.log(JSON.stringify({
  mode: apply ? "mark-deleting-only" : "dry-run",
  note: "No R2 object was deleted.",
  cutoff,
  candidates,
}, null, 2));
