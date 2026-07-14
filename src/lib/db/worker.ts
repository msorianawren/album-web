import "server-only";
import { isValidWorkerAuthorization } from "@/lib/authorization/worker-secret";
import { createTrustedServiceRoleClient } from "@/lib/db/trusted-service";

export type TrustedWorkerPurpose = "access-auto-approval" | "log-retention" | "media-processing";

export interface TrustedWorkerDatabase {
  purpose: TrustedWorkerPurpose;
  client: ReturnType<typeof createTrustedServiceRoleClient>;
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
