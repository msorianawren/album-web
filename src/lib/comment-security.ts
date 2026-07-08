import "server-only";
import type { NextRequest } from "next/server";
import { getRequestIp, hashIpAddress } from "@/lib/request-info";
import { supabase } from "@/lib/supabase";
import type { PublicSession, SiteSettings } from "@/lib/types";

const dangerousCommentPatterns = [
  /<\s*script/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /<\s*iframe/i,
  /<\s*object/i,
  /<\s*embed/i,
];

const linkPattern = /(?:https?:\/\/|www\.|t\.me\/|bit\.ly\/|tinyurl\.com\/)/i;

function normalizeComment(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getCommentIpHash(request: NextRequest) {
  return hashIpAddress(getRequestIp(request));
}

export function inspectCommentContent(body: string, settings: SiteSettings) {
  const normalized = normalizeComment(body);
  if (dangerousCommentPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      status: "rejected" as const,
      reason: "Comment contains script-like or embedded active content.",
    };
  }

  if (settings.block_comment_links && linkPattern.test(normalized)) {
    return settings.moderate_suspicious_comments
      ? {
          status: "pending" as const,
          reason: "Comment contains a link and is waiting for admin review.",
        }
      : {
          status: "rejected" as const,
          reason: "Links are not allowed in comments.",
        };
  }

  return { status: "visible" as const, reason: null };
}

export async function hasDuplicateRecentComment({
  session,
  ipHash,
  body,
}: {
  session: PublicSession;
  ipHash: string;
  body: string;
}) {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  let query = supabase
    .from("comments")
    .select("id,body")
    .gte("created_at", since)
    .limit(25);

  query = session.userId
    ? query.eq("author_user_id", session.userId)
    : query.eq("ip_hash", ipHash);

  const { data } = await query;
  const normalized = normalizeComment(body);
  return Boolean(data?.some((comment) => normalizeComment(String(comment.body ?? "")) === normalized));
}
