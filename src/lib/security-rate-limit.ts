import "server-only";
import type { NextRequest } from "next/server";
import { logAuditEvent } from "@/lib/audit";
import { getRequestFingerprint } from "@/lib/request-info";
import { supabase } from "@/lib/supabase";
import type { PublicSession } from "@/lib/types";

export interface RateLimitPolicy {
  action: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function getRateKey(request: NextRequest, session: PublicSession, action: string) {
  if (session.userId) return `user:${session.userId}:${action}`;
  return `browser:${getRequestFingerprint(request)}:${action}`;
}

export async function enforceRateLimit({
  request,
  session,
  policy,
}: {
  request: NextRequest;
  session: PublicSession;
  policy: RateLimitPolicy;
}): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + policy.windowSeconds * 1000);
  const key = getRateKey(request, session, policy.action);

  const { data: current } = await supabase
    .from("security_rate_limits")
    .select("count,reset_at")
    .eq("key", key)
    .eq("action", policy.action)
    .maybeSingle();

  if (!current || new Date(String(current.reset_at)).getTime() <= now.getTime()) {
    await supabase.from("security_rate_limits").upsert(
      {
        key,
        action: policy.action,
        count: 1,
        reset_at: resetAt.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: "key,action" },
    );
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(String(current.reset_at)).getTime() - now.getTime()) / 1000),
  );

  if (Number(current.count) >= policy.limit) {
    await logAuditEvent({
      request,
      session,
      action: "rate_limit_blocked",
      targetType: "security",
      metadata: {
        action: policy.action,
        limit: policy.limit,
        windowSeconds: policy.windowSeconds,
        retryAfterSeconds,
      },
    });
    return { allowed: false, retryAfterSeconds };
  }

  await supabase
    .from("security_rate_limits")
    .update({
      count: Number(current.count) + 1,
      updated_at: now.toISOString(),
    })
    .eq("key", key)
    .eq("action", policy.action);

  return { allowed: true, retryAfterSeconds };
}
