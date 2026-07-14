import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createTrustedServiceRoleClient } from "@/lib/db/trusted-service";

export type TrustedWorkerPurpose = "access-auto-approval" | "log-retention" | "media-processing";

export interface TrustedWorkerDatabase {
  purpose: TrustedWorkerPurpose;
  client: ReturnType<typeof createTrustedServiceRoleClient>;
}

export function isValidWorkerAuthorization(
  authorizationHeader: string | null,
  expectedSecret: string | undefined,
) {
  if (!authorizationHeader || !expectedSecret) return false;
  const expected = `Bearer ${expectedSecret}`;
  const actualBuffer = Buffer.from(authorizationHeader);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function getTrustedWorkerDatabase(
  request: Request,
  purpose: TrustedWorkerPurpose,
): TrustedWorkerDatabase | null {
  if (
    !isValidWorkerAuthorization(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return null;
  }

  return { purpose, client: createTrustedServiceRoleClient() };
}
