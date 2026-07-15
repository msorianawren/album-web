import { createHash, randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  createStorageClient,
  createTrustedDatabase,
  deleteObject,
  hasFlag,
  headObject,
  privateBucket,
  publicBucket,
  readJson,
  runBounded,
  writeJsonAtomic,
} from "../private-media/common.mjs";

const checkpointPath = join(process.cwd(), "MEDIA_PROCESSING_CANARY.json");
const database = createTrustedDatabase();
const storage = createStorageClient();
const privateBucketName = privateBucket();
if (!privateBucketName) throw new Error("R2_PRIVATE_BUCKET_NAME is required.");

async function ownerId() {
  const profile = await database
    .from("user_profiles")
    .select("user_id")
    .in("role", ["founder", "admin"])
    .eq("is_blocked", false)
    .limit(1)
    .maybeSingle();
  if (profile.error) throw profile.error;
  if (profile.data?.user_id) return profile.data.user_id;
  const users = await database.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (users.error || !users.data.users[0]) throw users.error ?? new Error("No canary owner is available.");
  return users.data.users[0].id;
}

async function createBuffers() {
  const normal = await sharp({
    create: { width: 320, height: 220, channels: 3, background: { r: 42, g: 122, b: 164 } },
  }).jpeg({ quality: 90 }).toBuffer();
  const exif = await sharp({
    create: { width: 180, height: 300, channels: 3, background: { r: 184, g: 72, b: 104 } },
  }).jpeg({ quality: 90 }).withMetadata({ orientation: 6 }).toBuffer();
  const oversized = await sharp({
    create: { width: 20_001, height: 2, channels: 3, background: { r: 20, g: 20, b: 20 } },
  }).jpeg({ quality: 70 }).toBuffer();
  return { normal, exif, oversized, invalid: Buffer.from("invalid-jpeg-canary") };
}

async function register(albumId, label, buffer, { upload = true } = {}) {
  const mediaId = randomUUID();
  const sourceKey = `staging/media/${mediaId}/source.jpg`;
  const sourceSize = upload ? buffer.byteLength : 128;
  const registration = await database.rpc("register_media_processing_upload", {
    target_media_id: mediaId,
    target_album_id: albumId,
    source_key: sourceKey,
    source_mime: "image/jpeg",
    source_name: `${label}.jpg`,
    source_bytes: sourceSize,
    target_idempotency_key: createHash("sha256").update(`canary:${mediaId}:${sourceSize}`).digest("hex"),
  });
  if (registration.error) throw registration.error;
  if (upload) {
    await storage.send(new PutObjectCommand({
      Bucket: privateBucketName,
      Key: sourceKey,
      Body: buffer,
      ContentType: "image/jpeg",
      CacheControl: "private, no-store",
    }));
  }
  const queued = await database.rpc("queue_media_processing_upload", { target_media_id: mediaId });
  if (queued.error) throw queued.error;
  return { mediaId, sourceKey, label };
}

async function setup() {
  const owner = await ownerId();
  const marker = randomUUID().slice(0, 8);
  const publicAlbumId = randomUUID();
  const privateAlbumId = randomUUID();
  const albums = await database.from("albums").insert([
    { id: publicAlbumId, owner_id: owner, title: "Processing canary public", slug: `processing-canary-public-${marker}`, status: "public" },
    { id: privateAlbumId, owner_id: owner, title: "Processing canary private", slug: `processing-canary-private-${marker}`, status: "private" },
  ]);
  if (albums.error) throw albums.error;

  const buffers = await createBuffers();
  const cases = {
    publicReady: await register(publicAlbumId, "public-ready", buffers.normal),
    privateDuplicate: await register(privateAlbumId, "private-duplicate", buffers.normal),
    privateExif: await register(privateAlbumId, "private-exif", buffers.exif),
    oversized: await register(privateAlbumId, "oversized", buffers.oversized),
    invalid: await register(privateAlbumId, "invalid", buffers.invalid),
    missing: await register(privateAlbumId, "missing-source", Buffer.alloc(0), { upload: false }),
  };
  await writeJsonAtomic(checkpointPath, {
    createdAt: new Date().toISOString(),
    albums: { publicAlbumId, privateAlbumId },
    cases,
  });
  console.log(JSON.stringify({ setup: true, albums: 2, jobs: Object.keys(cases).length }));
}

async function loadCanary() {
  const checkpoint = await readJson(checkpointPath);
  if (!checkpoint?.cases || !checkpoint?.albums) throw new Error("Run canary setup first.");
  return checkpoint;
}

async function verifyInitial() {
  const checkpoint = await loadCanary();
  const ids = Object.values(checkpoint.cases).map((item) => item.mediaId);
  const [mediaResult, jobsResult, manifestResult] = await Promise.all([
    database.from("media").select("id,processing_status,r2_key,url,thumbnail_r2_key,medium_r2_key,large_r2_key,content_hash,duplicate_of_media_id,blurhash,metadata_stripped").in("id", ids),
    database.from("media_processing_jobs").select("media_id,state,attempt_count,last_error_code").in("media_id", ids),
    database.from("private_media_assets").select("media_id,variant,object_key,bucket_role,migration_state").in("media_id", ids),
  ]);
  if (mediaResult.error) throw mediaResult.error;
  if (jobsResult.error) throw jobsResult.error;
  if (manifestResult.error) throw manifestResult.error;
  const media = new Map(mediaResult.data.map((row) => [row.id, row]));
  const jobs = new Map(jobsResult.data.map((row) => [row.media_id, row]));
  const readyCases = [checkpoint.cases.publicReady, checkpoint.cases.privateDuplicate, checkpoint.cases.privateExif];
  for (const item of readyCases) {
    const row = media.get(item.mediaId);
    if (!row || row.processing_status !== "ready" || !row.content_hash || !row.blurhash || !row.metadata_stripped) {
      throw new Error(`Canary ${item.label} did not reach a publishable ready state.`);
    }
    if (!row.thumbnail_r2_key || !row.medium_r2_key || !row.large_r2_key) {
      throw new Error(`Canary ${item.label} is missing derivatives.`);
    }
  }
  if (media.get(checkpoint.cases.privateDuplicate.mediaId)?.duplicate_of_media_id !== checkpoint.cases.publicReady.mediaId) {
    throw new Error("Duplicate detection did not link the private duplicate to the first ready image.");
  }
  for (const item of [checkpoint.cases.oversized, checkpoint.cases.invalid]) {
    const row = media.get(item.mediaId);
    const job = jobs.get(item.mediaId);
    if (!row || row.processing_status !== "quarantined" || job?.state !== "quarantined" || row.r2_key || row.url) {
      throw new Error(`Canary ${item.label} was not quarantined without publishing.`);
    }
  }
  const missingMedia = media.get(checkpoint.cases.missing.mediaId);
  const missingJob = jobs.get(checkpoint.cases.missing.mediaId);
  if (!missingMedia || missingMedia.processing_status !== "queued" || missingJob?.state !== "queued" || missingJob.attempt_count < 2 || missingMedia.r2_key || missingMedia.url) {
    throw new Error("Missing-source canary did not retry without publishing.");
  }

  const privateReadyIds = new Set([checkpoint.cases.privateDuplicate.mediaId, checkpoint.cases.privateExif.mediaId]);
  const privateManifest = manifestResult.data.filter((row) => privateReadyIds.has(row.media_id));
  if (privateManifest.length !== 6 || privateManifest.some((row) => row.bucket_role !== "private" || row.migration_state !== "active")) {
    throw new Error("Private canary derivatives are not active in the private manifest.");
  }

  await runBounded(
    readyCases.flatMap((item) => {
      const row = media.get(item.mediaId);
      const role = item === checkpoint.cases.publicReady ? "public" : "private";
      const bucket = role === "public" ? publicBucket() : privateBucketName;
      return [row.thumbnail_r2_key, row.medium_r2_key, row.large_r2_key].map((key) => ({ bucket, key }));
    }),
    6,
    async ({ bucket, key }) => headObject(storage, bucket, key),
    async (chunk) => {
      if (chunk.some((head) => !head.exists || !head.size)) throw new Error("Canary derivative verification failed.");
    },
  );

  const publicRow = media.get(checkpoint.cases.publicReady.mediaId);
  checkpoint.idempotencyBaseline = {
    contentHash: publicRow.content_hash,
    thumbnailKey: publicRow.thumbnail_r2_key,
    mediumKey: publicRow.medium_r2_key,
    largeKey: publicRow.large_r2_key,
  };
  await writeJsonAtomic(checkpointPath, checkpoint);
  console.log(JSON.stringify({ ready: 3, quarantined: 2, retried: 1, privateManifest: privateManifest.length }));
}

async function requeue() {
  const checkpoint = await loadCanary();
  const result = await database.rpc("requeue_media_processing_job", {
    target_media_id: checkpoint.cases.publicReady.mediaId,
  });
  if (result.error) throw result.error;
  console.log(JSON.stringify({ requeued: true }));
}

async function verifyIdempotency() {
  const checkpoint = await loadCanary();
  const id = checkpoint.cases.publicReady.mediaId;
  const [mediaResult, jobsResult] = await Promise.all([
    database.from("media").select("processing_status,content_hash,thumbnail_r2_key,medium_r2_key,large_r2_key").eq("id", id).single(),
    database.from("media_processing_jobs").select("id,state").eq("media_id", id),
  ]);
  if (mediaResult.error) throw mediaResult.error;
  if (jobsResult.error) throw jobsResult.error;
  const row = mediaResult.data;
  const baseline = checkpoint.idempotencyBaseline;
  if (!baseline || row.processing_status !== "ready" || jobsResult.data.length !== 1 || jobsResult.data[0].state !== "ready") {
    throw new Error("Idempotency rerun did not finish cleanly.");
  }
  if (row.content_hash !== baseline.contentHash || row.thumbnail_r2_key !== baseline.thumbnailKey || row.medium_r2_key !== baseline.mediumKey || row.large_r2_key !== baseline.largeKey) {
    throw new Error("Idempotency rerun changed deterministic output identity.");
  }
  console.log(JSON.stringify({ idempotent: true, duplicateJobs: 0 }));
}

async function verifyTerminalFailure() {
  const checkpoint = await loadCanary();
  const id = checkpoint.cases.missing.mediaId;
  const [mediaResult, jobResult] = await Promise.all([
    database.from("media").select("processing_status,r2_key,url").eq("id", id).single(),
    database.from("media_processing_jobs").select("state,attempt_count").eq("media_id", id).single(),
  ]);
  if (mediaResult.error) throw mediaResult.error;
  if (jobResult.error) throw jobResult.error;
  if (mediaResult.data.processing_status !== "failed" || mediaResult.data.r2_key || mediaResult.data.url || jobResult.data.state !== "failed" || jobResult.data.attempt_count !== 4) {
    throw new Error("Missing-source canary did not reach terminal failure without publishing.");
  }
  console.log(JSON.stringify({ terminalFailure: true, attempts: jobResult.data.attempt_count, published: false }));
}

async function cleanup() {
  const checkpoint = await loadCanary();
  const ids = Object.values(checkpoint.cases).map((item) => item.mediaId);
  const [mediaResult, manifestResult] = await Promise.all([
    database.from("media").select("id,album_id,r2_key,thumbnail_r2_key,medium_r2_key,large_r2_key,avif_thumbnail_r2_key,avif_medium_r2_key,avif_large_r2_key").in("id", ids),
    database.from("private_media_assets").select("object_key").in("media_id", ids),
  ]);
  if (mediaResult.error) throw mediaResult.error;
  if (manifestResult.error) throw manifestResult.error;
  const publicAlbumId = checkpoint.albums.publicAlbumId;
  const publicKeys = new Set();
  const privateKeys = new Set(Object.values(checkpoint.cases).map((item) => item.sourceKey));
  for (const row of mediaResult.data) {
    const target = row.album_id === publicAlbumId ? publicKeys : privateKeys;
    for (const key of [row.r2_key, row.thumbnail_r2_key, row.medium_r2_key, row.large_r2_key, row.avif_thumbnail_r2_key, row.avif_medium_r2_key, row.avif_large_r2_key]) {
      if (key) target.add(key);
    }
  }
  for (const row of manifestResult.data) if (row.object_key) privateKeys.add(row.object_key);

  await runBounded(
    [
      ...[...publicKeys].map((key) => ({ bucket: publicBucket(), key })),
      ...[...privateKeys].map((key) => ({ bucket: privateBucketName, key })),
    ],
    6,
    async ({ bucket, key }) => deleteObject(storage, bucket, key),
    async () => {},
  );
  const deleted = await database.from("albums").delete().in("id", Object.values(checkpoint.albums));
  if (deleted.error) throw deleted.error;
  await unlink(checkpointPath).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
  console.log(JSON.stringify({ cleaned: true, albums: 2, media: ids.length }));
}

if (hasFlag("--setup")) await setup();
else if (hasFlag("--verify-initial")) await verifyInitial();
else if (hasFlag("--requeue")) await requeue();
else if (hasFlag("--verify-idempotency")) await verifyIdempotency();
else if (hasFlag("--verify-terminal-failure")) await verifyTerminalFailure();
else if (hasFlag("--cleanup")) await cleanup();
else throw new Error("Choose a supported canary operation flag.");
