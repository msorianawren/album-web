export interface PrivateMediaManifestCandidate {
  variant: string;
  object_key: string;
  legacy_object_key?: string | null;
  bucket_role: string;
  mime_type?: string | null;
  migration_state: string;
}

export function isSafePrivateMediaObjectKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 1024 &&
    !value.startsWith("/") &&
    !value.includes("..") &&
    !/^https?:\/\//i.test(value)
  );
}

export function selectPrivateMediaManifestSource(
  rows: PrivateMediaManifestCandidate[],
  variantOrder: string[],
) {
  const candidates = variantOrder
    .flatMap((variant) => rows.filter((row) => row.variant === variant))
    .filter((row) => isSafePrivateMediaObjectKey(row.object_key));
  const active = candidates.find(
    (row) => row.bucket_role === "private" && row.migration_state === "active",
  );
  if (active) {
    return {
      objectKey: active.object_key,
      bucketRole: "private" as const,
      contentType: active.mime_type ?? null,
      fallbackObjectKey: isSafePrivateMediaObjectKey(active.legacy_object_key)
        ? active.legacy_object_key
        : null,
    };
  }

  const legacy = candidates.find((row) => row.bucket_role === "public");
  if (!legacy) return null;
  return {
    objectKey: legacy.object_key,
    bucketRole: "public" as const,
    contentType: legacy.mime_type ?? null,
    fallbackObjectKey: null,
  };
}
