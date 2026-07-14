import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createStorageFailure } from "@/lib/app-failure";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
  throw new Error("Missing Cloudflare R2 environment variables.");
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

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
}: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl: string;
}) {
  await withStorageFailure("r2.put_object", () =>
    r2.send(
      new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    ),
  );

  return getPublicUrl(key);
}

export async function deleteR2Objects(keys: Array<string | null | undefined>) {
  const objects = keys
    .filter((key): key is string => Boolean(key))
    .map((Key) => ({ Key }));

  if (!objects.length) return;

  await withStorageFailure("r2.delete_objects", () =>
    r2.send(
      new DeleteObjectsCommand({
        Bucket: getR2Bucket(),
        Delete: {
          Objects: objects,
          Quiet: true,
        },
      }),
    ),
  );
}

export async function getPresignedPutUrl({
  key,
  contentType,
  expiresIn = 300,
}: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  return withStorageFailure("r2.presign_put", () => {
    const command = new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(r2, command, { expiresIn });
  });
}

export async function getR2Object(key: string): Promise<Buffer> {
  const response = await withStorageFailure("r2.get_object", () =>
    r2.send(
      new GetObjectCommand({
        Bucket: getR2Bucket(),
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
