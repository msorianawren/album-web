import { createTrustedDatabase, getOption, hasFlag } from "../private-media/common.mjs";

const apply = hasFlag("--apply");
const mediaId = getOption("--media-id", "");
const limit = Math.max(1, Math.min(Number(getOption("--limit", "25")), 200));
const database = createTrustedDatabase();

let query = database
  .from("media_processing_jobs")
  .select("media_id,state,attempt_count,updated_at")
  .in("state", ["ready", "failed", "quarantined"])
  .order("updated_at", { ascending: true })
  .limit(limit);
if (mediaId) query = query.eq("media_id", mediaId);
const { data, error } = await query;
if (error) throw error;

const candidates = data ?? [];
if (apply) {
  for (const candidate of candidates) {
    const result = await database.rpc("requeue_media_processing_job", {
      target_media_id: candidate.media_id,
    });
    if (result.error) throw result.error;
  }
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", candidates: candidates.length, mediaIds: candidates.map((row) => row.media_id) }, null, 2));
