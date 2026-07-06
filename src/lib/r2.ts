import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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
  await r2.send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );

  return getPublicUrl(key);
}

export async function deleteR2Objects(keys: Array<string | null | undefined>) {
  const objects = keys
    .filter((key): key is string => Boolean(key))
    .map((Key) => ({ Key }));

  if (!objects.length) return;

  await r2.send(
    new DeleteObjectsCommand({
      Bucket: getR2Bucket(),
      Delete: {
        Objects: objects,
        Quiet: true,
      },
    }),
  );
}
