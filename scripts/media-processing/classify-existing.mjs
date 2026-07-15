import { createTrustedDatabase } from "../private-media/common.mjs";

const database = createTrustedDatabase();

async function count(query) {
  const { count: total, error } = await query;
  if (error) throw error;
  return total ?? 0;
}

const [ready, legacyImages, missingDerivatives, failedMetadata, quarantined, queuedMedia, jobs] = await Promise.all([
  count(database.from("media").select("id", { count: "exact", head: true }).eq("processing_status", "ready")),
  count(database.from("media").select("id", { count: "exact", head: true }).eq("media_type", "image").eq("processing_status", "ready").is("content_hash", null)),
  count(database.from("media").select("id", { count: "exact", head: true }).eq("media_type", "image").eq("processing_status", "ready").is("thumbnail_r2_key", null).is("medium_r2_key", null)),
  count(database.from("media").select("id", { count: "exact", head: true }).eq("media_type", "image").eq("processing_status", "ready").or("width.is.null,height.is.null")),
  count(database.from("media").select("id", { count: "exact", head: true }).eq("processing_status", "quarantined")),
  database.from("media").select("id,media_type,r2_key,url").eq("processing_status", "queued").limit(500),
  database.from("media_processing_jobs").select("media_id,state").limit(500),
]);

if (queuedMedia.error) throw queuedMedia.error;
if (jobs.error) throw jobs.error;
const jobMediaIds = new Set((jobs.data ?? []).map((row) => row.media_id));
const queuedWithoutJob = (queuedMedia.data ?? []).filter((row) => !jobMediaIds.has(row.id));
const workingLegacyVideos = queuedWithoutJob.filter((row) => row.media_type === "video" && row.r2_key && row.url);

console.log(JSON.stringify({
  ready,
  needsReprocessing: legacyImages,
  missingDerivative: missingDerivatives,
  failedMetadata,
  quarantinedCandidate: quarantined,
  queuedWithoutJob: queuedWithoutJob.length,
  workingLegacyVideo: workingLegacyVideos.length,
  note: "Classification only; existing ready media remains published and unchanged.",
}, null, 2));
