import type { NextRequest } from "next/server";
import { getRequestIp } from "@/lib/request-info";
import { supabase } from "@/lib/supabase";
import type { PublicSession } from "@/lib/types";

export async function logAuditEvent({
  request,
  session,
  action,
  targetType,
  targetId,
  metadata = {},
}: {
  request?: NextRequest;
  session: PublicSession;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabase.from("audit_logs").insert({
    actor_user_id: session.userId,
    actor_email: session.email,
    action,
    target_type: targetType,
    target_id: targetId,
    path: request?.nextUrl.pathname,
    method: request?.method,
    ip_address: request ? getRequestIp(request) : null,
    user_agent: request?.headers.get("user-agent"),
    metadata,
  });
}
