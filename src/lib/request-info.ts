import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

export function getRequestIp(request?: NextRequest | null) {
  if (!request) return "unknown";
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function hashIpAddress(ip: string) {
  return createHash("sha256")
    .update(`${process.env.IP_HASH_SALT ?? "album-web"}:${ip}`)
    .digest("hex");
}

export function getRequestFingerprint(request?: NextRequest | null) {
  const ip = getRequestIp(request);
  const userAgent = request?.headers.get("user-agent") ?? "";
  return createHash("sha256")
    .update(`${process.env.IP_HASH_SALT ?? "album-web"}:${ip}:${userAgent}`)
    .digest("hex");
}
