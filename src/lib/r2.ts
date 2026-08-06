import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createStorageFailure } from "@/lib/app-failure";

type R2Credentials = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
};

let publicR2: S3Client | null = null;
let privateR2: S3Client | null = null;

function createR2Client({ accountId, accessKeyId, secretAccessKey }: R2Credentials) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getPublicR2Credentials(): R2Credentials {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing Cloudflare R2 environment variables.");
  }

  return { accountId, accessKeyId, secretAccessKey };
}

function getPrivateR2Credentials(): R2Credentials {
  const accountId = process.env.R2_PRIVATE_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_PRIVATE_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_PRIVATE_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing Cloudflare private R2 environment variables.");
  }

  return { accountId, accessKeyId, secretAccessKey };
}

export function getR2Client() {
  publicR2 ??= createR2Client(getPublicR2Credentials());
  return publicR2;
}

function getPrivateR2Client() {
  privateR2 ??= createR2Client(getPrivateR2Credentials());
  return privateR2;
}

async function withStorageFailure<T>(operation: string, task: () => Promise<T>) {
  try {
    return await task();
  } catch (error) {
    throw createStorageFailure(error, operation);
  }
}

export function getR2Bucket() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Missing R2_BUCKET_NAME.");
  return bucket;
}

export type R2BucketRole = "public" | "private";

export function getR2BucketForRole(role: R2BucketRole) {
  if (role === "private") {
    const bucket = process.env.R2_PRIVATE_BUCKET_NAME;
    if (!bucket) throw new Error("Missing R2_PRIVATE_BUCKET_NAME.");
    return bucket;
  }
  return getR2Bucket();
}

function getR2ClientForRole(role: R2BucketRole) {
  if (role === "private") {
    return getPrivateR2Client();
  }
  return getR2Client();
}

export function getPublicUrl(key: string) {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) return key;
  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

export async function putR2Object({
  key,
  body,
  contentType,
  cacheControl,
  bucketRole = "public",
}: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl: string;
  bucketRole?: R2BucketRole;
}) {
  await withStorageFailure("r2.put_object", () =>
    getR2ClientForRole(bucketRole).send(
      new PutObjectCommand({
        Bucket: getR2BucketForRole(bucketRole),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    ),
  );

  return bucketRole === "public" ? getPublicUrl(key) : key;
}

export async function deleteR2Objects(
  keys: Array<string | null | undefined>,
  bucketRole: R2BucketRole = "public",
) {
  const filtered = keys
    .filter((key): key is string => Boolean(key?.trim()))
    .map((Key) => ({ Key: Key.trim() }));

  if (!filtered.length) return;

  const client = getR2ClientForRole(bucketRole);
  const bucket = getR2BucketForRole(bucketRole);

  // S3 / R2 DeleteObjectsCommand accepts maximum 1000 objects per API call
  const BATCH_SIZE = 1000;
  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    await withStorageFailure("r2.delete_objects", () =>
      client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch,
            Quiet: true,
          },
        }),
      ),
    );
  }
}

export interface MediaR2KeysRow {
  r2_key?: string | null;
  thumbnail_r2_key?: string | null;
  medium_r2_key?: string | null;
  large_r2_key?: string | null;
  poster_r2_key?: string | null;
  public_r2_key?: string | null;
  original_private_r2_key?: string | null;
  avif_thumbnail_r2_key?: string | null;
  avif_medium_r2_key?: string | null;
  avif_large_r2_key?: string | null;
}

export interface PrivateAssetKeyRow {
  object_key?: string | null;
  legacy_object_key?: string | null;
  bucket_role?: R2BucketRole | null;
}

export async function purgeMediaR2Keys(
  mediaRows: MediaR2KeysRow[],
  privateAssetRows: PrivateAssetKeyRow[] = [],
) {
  const publicKeys = new Set<string>();
  const privateKeys = new Set<string>();

  for (const item of mediaRows) {
    if (item.r2_key) publicKeys.add(item.r2_key);
    if (item.thumbnail_r2_key) publicKeys.add(item.thumbnail_r2_key);
    if (item.medium_r2_key) publicKeys.add(item.medium_r2_key);
    if (item.large_r2_key) publicKeys.add(item.large_r2_key);
    if (item.poster_r2_key) publicKeys.add(item.poster_r2_key);
    if (item.public_r2_key) publicKeys.add(item.public_r2_key);
    if (item.avif_thumbnail_r2_key) publicKeys.add(item.avif_thumbnail_r2_key);
    if (item.avif_medium_r2_key) publicKeys.add(item.avif_medium_r2_key);
    if (item.avif_large_r2_key) publicKeys.add(item.avif_large_r2_key);

    if (item.original_private_r2_key) privateKeys.add(item.original_private_r2_key);
  }

  for (const asset of privateAssetRows) {
    const role = asset.bucket_role === "private" ? "private" : "public";
    if (asset.object_key) {
      if (role === "private") privateKeys.add(asset.object_key);
      else publicKeys.add(asset.object_key);
    }
    if (asset.legacy_object_key) {
      if (role === "private") privateKeys.add(asset.legacy_object_key);
      else publicKeys.add(asset.legacy_object_key);
    }
  }

  if (publicKeys.size > 0) {
    await deleteR2Objects(Array.from(publicKeys), "public");
  }
  if (privateKeys.size > 0) {
    try {
      await deleteR2Objects(Array.from(privateKeys), "private");
    } catch {
      // Ignore if private bucket is not configured
    }
  }
}

export async function getPresignedPutUrl({
  key,
  contentType,
  expiresIn = 300,
  bucketRole = "public",
}: {
  key: string;
  contentType: string;
  expiresIn?: number;
  bucketRole?: R2BucketRole;
}) {
  return withStorageFailure("r2.presign_put", () => {
    const command = new PutObjectCommand({
      Bucket: getR2BucketForRole(bucketRole),
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(getR2ClientForRole(bucketRole), command, { expiresIn });
  });
}

export async function getPresignedGetUrl({
  key,
  expiresIn = 120,
  bucketRole = "private",
}: {
  key: string;
  expiresIn?: number;
  bucketRole?: R2BucketRole;
}) {
  return withStorageFailure("r2.presign_get", () =>
    getSignedUrl(
      getR2ClientForRole(bucketRole),
      new GetObjectCommand({ Bucket: getR2BucketForRole(bucketRole), Key: key }),
      { expiresIn },
    ),
  );
}

export async function headR2Object(
  key: string,
  bucketRole: R2BucketRole = "public",
) {
  const response = await withStorageFailure("r2.head_object", () =>
    getR2ClientForRole(bucketRole).send(
      new HeadObjectCommand({
        Bucket: getR2BucketForRole(bucketRole),
        Key: key,
      }),
    ),
  );
  return {
    contentLength: response.ContentLength ?? null,
    contentType: response.ContentType ?? null,
    etag: response.ETag ?? null,
    lastModified: response.LastModified?.toISOString() ?? null,
  };
}

export async function tryHeadR2Object(
  key: string,
  bucketRole: R2BucketRole = "public",
) {
  try {
    return {
      exists: true as const,
      ...(await headR2Object(key, bucketRole)),
    };
  } catch (error) {
    const cause = error instanceof Error && "cause" in error ? error.cause : error;
    const status = typeof cause === "object" && cause && "$metadata" in cause
      ? (cause as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : undefined;
    const name = typeof cause === "object" && cause && "name" in cause
      ? String((cause as { name?: unknown }).name)
      : "";
    const code = typeof cause === "object" && cause && "Code" in cause
      ? String((cause as { Code?: unknown }).Code)
      : "";
    if (status === 404 || name === "NotFound" || code === "NoSuchKey") {
      return {
        exists: false as const,
        contentLength: null,
        contentType: null,
        etag: null,
      };
    }
    throw error;
  }
}

export async function getR2Object(
  key: string,
  bucketRole: R2BucketRole = "public",
): Promise<Buffer> {
  const response = await withStorageFailure("r2.get_object", () =>
    getR2ClientForRole(bucketRole).send(
      new GetObjectCommand({
        Bucket: getR2BucketForRole(bucketRole),
        Key: key,
      }),
    ),
  );
  if (!response.Body) {
    throw createStorageFailure(new Error("Empty response body from R2"), "r2.get_object");
  }
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function getR2ObjectStream({
  key,
  bucketRole = "public",
  range,
}: {
  key: string;
  bucketRole?: R2BucketRole;
  range?: string;
}) {
  const response = await withStorageFailure("r2.get_object_stream", () =>
    getR2ClientForRole(bucketRole).send(
      new GetObjectCommand({
        Bucket: getR2BucketForRole(bucketRole),
        Key: key,
        Range: range,
      }),
    ),
  );
  if (!response.Body) {
    throw createStorageFailure(new Error("Empty response body from R2"), "r2.get_object_stream");
  }

  return {
    body: response.Body.transformToWebStream(),
    contentLength: response.ContentLength,
    contentRange: response.ContentRange,
    contentType: response.ContentType,
  };
}
