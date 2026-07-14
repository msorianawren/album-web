import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  CopyObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

nextEnv.loadEnvConfig(process.cwd());

export const workspace = process.cwd();
export const inventoryPath = join(workspace, "PRIVATE_MEDIA_INVENTORY.json");
export const inventoryReportPath = join(workspace, "PRIVATE_MEDIA_INVENTORY_REPORT.md");
export const checkpointDirectory = join(workspace, ".private-media-checkpoints");

export function hasFlag(flag) {
  return process.argv.slice(2).includes(flag);
}

export function getOption(name, fallback) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createTrustedDatabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function createStorageClient() {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export function publicBucket() {
  return requireEnv("R2_BUCKET_NAME");
}

export function privateBucket() {
  return process.env.R2_PRIVATE_BUCKET_NAME || null;
}

export function publicBaseUrl() {
  return process.env.R2_PUBLIC_URL?.replace(/\/$/, "") || null;
}

export async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeTextAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, value, "utf8");
  await rename(temporary, path);
}

export async function fetchAll(builderFactory, pageSize = 500) {
  const rows = [];
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await builderFactory(start, start + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export function intendedPrivateKey(albumId, mediaId, variant, sourceKey) {
  const basename = sourceKey.split("/").filter(Boolean).at(-1) || "asset.bin";
  return `private/albums/${albumId}/${mediaId}/${variant}/${basename}`;
}

export function mediaVariants(media) {
  const image = media.media_type === "image";
  const candidates = [
    ["thumbnail", media.thumbnail_r2_key || media.poster_r2_key || media.medium_r2_key || media.public_r2_key || media.r2_key, "image/webp"],
    ["medium", media.medium_r2_key || media.public_r2_key || media.thumbnail_r2_key || media.r2_key, image ? "image/webp" : media.mime_type],
    ["poster", media.poster_r2_key || media.thumbnail_r2_key, "image/webp"],
    ["display", image ? media.medium_r2_key || media.public_r2_key || media.thumbnail_r2_key || media.r2_key : media.r2_key, image ? "image/webp" : media.mime_type],
    ["original", media.original_private_r2_key || media.r2_key, media.mime_type],
    ["video", image ? null : media.r2_key, image ? null : media.mime_type],
  ];
  return candidates
    .filter(([, key]) => typeof key === "string" && key.length > 0)
    .map(([variant, key, mimeType]) => ({
      variant,
      currentKey: key,
      intendedPrivateKey: intendedPrivateKey(media.album_id, media.id, variant, key),
      mimeType: mimeType || null,
    }));
}

export function cleanEtag(value) {
  return typeof value === "string" ? value.replace(/^"|"$/g, "") : null;
}

export async function headObject(storage, bucket, key) {
  try {
    const result = await storage.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      exists: true,
      contentType: result.ContentType || null,
      size: Number(result.ContentLength ?? 0),
      etag: cleanEtag(result.ETag),
      checksum: result.ChecksumSHA256 || result.ChecksumCRC32C || result.ChecksumCRC32 || null,
    };
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound" || error?.Code === "NoSuchKey") {
      return { exists: false, contentType: null, size: null, etag: null, checksum: null };
    }
    throw error;
  }
}

export async function isPubliclyReachable(key) {
  const baseUrl = publicBaseUrl();
  if (!baseUrl) return null;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetch(`${baseUrl}/${encodedKey}`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return null;
  }
}

export async function runBounded(items, concurrency, worker, onChunk) {
  for (let start = 0; start < items.length; start += concurrency) {
    const chunk = items.slice(start, start + concurrency);
    const results = await Promise.all(chunk.map(worker));
    await onChunk(results);
  }
}

export async function withRetry(task, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

export async function copyObject(storage, sourceBucket, sourceKey, destinationBucket, destinationKey) {
  const encodedSource = `${sourceBucket}/${sourceKey.split("/").map(encodeURIComponent).join("/")}`;
  await storage.send(new CopyObjectCommand({
    Bucket: destinationBucket,
    Key: destinationKey,
    CopySource: encodedSource,
    MetadataDirective: "COPY",
  }));
}

export function safeErrorCode(error) {
  return String(error?.name || error?.code || error?.Code || "UNKNOWN").slice(0, 80);
}
