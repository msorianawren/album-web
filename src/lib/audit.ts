import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import type { PublicSession } from "@/lib/types";

function getClientIp(request?: NextRequest) {
  if (!request) return null;
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")
  );
}

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
    ip_address: getClientIp(request),
    user_agent: request?.headers.get("user-agent"),
    metadata,
  });
}
