import "server-only";
import { createTrustedServiceRoleClient } from "@/lib/db/trusted-service";

// Narrow service boundary used only after request JWT/RLS has authorized one media row.
export function createTrustedPrivateMediaDeliveryClient() {
  return createTrustedServiceRoleClient();
}
