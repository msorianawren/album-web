import "server-only";
import type { NextRequest } from "next/server";
import type { ResponseCookies } from "next/dist/server/web/spec-extension/cookies";
import { createHash } from "node:crypto";
import { supabase } from "@/lib/supabase";
import { getRequestFingerprint, getRequestIp, getRequestIpWhois } from "@/lib/request-info";

const GUEST_COOKIE_NAME = "gid";
const GUEST_COOKIE_TTL_DAYS = 365;

// ─── UA Parsing ───────────────────────────────────────────────────────────────

export interface DeviceInfo {
  device: string | null;   // "iPhone 16", "Android", "Windows PC"
  browser: string | null;  // "Safari", "Chrome", "Firefox"
  os: string | null;       // "iOS 18", "Android 14", "Windows 11"
  inApp: string | null;    // "Facebook", "Instagram", "Zalo", null
}

export function parseDeviceInfo(ua: string | null | undefined): DeviceInfo {
  if (!ua) return { device: null, browser: null, os: null, inApp: null };

  // In-App browsers (check first — UA often contains both)
  let inApp: string | null = null;
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) inApp = "Facebook";
  else if (/Instagram/i.test(ua)) inApp = "Instagram";
  else if (/TikTok/i.test(ua)) inApp = "TikTok";
  else if (/ZaloApp|Zalo/i.test(ua)) inApp = "Zalo";
  else if (/Twitter/i.test(ua)) inApp = "Twitter/X";
  else if (/Line\/[0-9]/i.test(ua)) inApp = "Line";
  else if (/Pinterest/i.test(ua)) inApp = "Pinterest";

  // OS
  let os: string | null = null;
  const iosMatch = ua.match(/CPU iPhone OS ([0-9_]+)|CPU OS ([0-9_]+)/i);
  if (iosMatch) {
    const v = (iosMatch[1] || iosMatch[2]).replace(/_/g, ".").split(".")[0];
    os = `iOS ${v}`;
  } else if (/Android ([0-9.]+)/i.test(ua)) {
    os = `Android ${ua.match(/Android ([0-9.]+)/i)![1].split(".")[0]}`;
  } else if (/Windows NT 10/i.test(ua)) {
    os = "Windows 11/10";
  } else if (/Mac OS X ([0-9_]+)/i.test(ua) && !/iPhone|iPad/i.test(ua)) {
    os = "macOS";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  // Device
  let device: string | null = null;
  if (/iPad/i.test(ua)) device = "iPad";
  else if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/Android/i.test(ua) && /Mobile/i.test(ua)) device = "Android Phone";
  else if (/Android/i.test(ua)) device = "Android Tablet";
  else if (/Windows/i.test(ua)) device = "Windows PC";
  else if (/Mac/i.test(ua)) device = "Mac";
  else if (/Linux/i.test(ua)) device = "Linux PC";

  // Browser
  let browser: string | null = null;
  if (!inApp) {
    if (/Edg\//i.test(ua)) browser = "Edge";
    else if (/OPR\//i.test(ua)) browser = "Opera";
    else if (/CriOS/i.test(ua)) browser = "Chrome (iOS)";
    else if (/Chrome\/[0-9]/i.test(ua)) browser = "Chrome";
    else if (/FxiOS/i.test(ua)) browser = "Firefox (iOS)";
    else if (/Firefox\/[0-9]/i.test(ua)) browser = "Firefox";
    else if (/Safari\/[0-9]/i.test(ua) && /Version\/[0-9]/i.test(ua)) browser = "Safari";
  }

  return { device, browser, os, inApp };
}

// ─── IP Masking ──────────────────────────────────────────────────────────────

export function maskIp(ip: string): string {
  if (!ip || ip === "unknown") return "unknown";
  // IPv4: mask last 2 octets → "203.0.x.x"
  const ipv4 = ip.match(/^(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (ipv4) return `${ipv4[1]}.x.x`;
  // IPv6: keep first 2 groups → "2001:db8::x"
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts.slice(0, 2).join(":")}::x`;
  }
  return "x.x.x.x";
}

// ─── Visitor Name Generation ──────────────────────────────────────────────────

function sanitizeLocationPart(raw: string | null | undefined): string {
  if (!raw) return "UNKNOWN";
  // Normalize: uppercase, keep only A-Z, strip accents
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 20) || "UNKNOWN";
}

async function buildVisitorName(city: string | null, countryCode: string | null): Promise<string> {
  const cityPart = sanitizeLocationPart(city);
  const base = cityPart !== "UNKNOWN" ? cityPart : sanitizeLocationPart(countryCode);

  // Count how many visitors share the same base prefix to generate unique suffix
  const { count } = await supabase
    .from("guest_visitors")
    .select("id", { count: "exact", head: true })
    .like("visitor_name", `${base}_%`);

  const suffix = (count ?? 0) + 1;
  return `${base}_${suffix}`;
}

// ─── Guest Visitor Types ──────────────────────────────────────────────────────

export interface GuestVisitorRecord {
  id: string;
  fingerprint: string;
  visitor_name: string;
  city: string | null;
  country_code: string | null;
  ip_masked: string | null;
  first_seen_at: string;
  last_seen_at: string;
  linked_user_id: string | null;
  metadata: Record<string, unknown>;
  expires_at: string;
}

// ─── Main: Get or Create Guest Visitor ───────────────────────────────────────

/**
 * Resolves the guest visitor for this request.
 * - Reads cookie "gid" as primary identifier.
 * - Falls back to fingerprint (IP+UA hash) if no cookie.
 * - Creates a new record if not found.
 * - Never throws — returns null on any failure to avoid breaking the user request.
 */
export async function getOrCreateGuestVisitor(
  request: NextRequest,
): Promise<GuestVisitorRecord | null> {
  try {
    const fingerprint = getRequestFingerprint(request);
    const cookieId = request.cookies.get(GUEST_COOKIE_NAME)?.value ?? null;

    // 1. Lookup by cookie ID first (most precise)
    if (cookieId) {
      const { data: existing } = await supabase
        .from("guest_visitors")
        .select("*")
        .eq("id", cookieId)
        .maybeSingle();

      if (existing) {
        // Update last_seen_at in background (fire-and-forget)
        supabase
          .from("guest_visitors")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", cookieId)
          .then(() => {/* ignore */});
        return existing as GuestVisitorRecord;
      }
    }

    // 2. Lookup by fingerprint (Incognito / cookie cleared)
    const { data: byFingerprint } = await supabase
      .from("guest_visitors")
      .select("*")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (byFingerprint) {
      supabase
        .from("guest_visitors")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", byFingerprint.id)
        .then(() => {/* ignore */});
      return byFingerprint as GuestVisitorRecord;
    }

    // 3. Create new visitor
    const ipInfo = getRequestIpWhois(request);
    const ip = getRequestIp(request);
    const ua = request.headers.get("user-agent") ?? null;
    const city = ipInfo?.city ?? null;
    const countryCode = ipInfo?.country ?? null;
    const deviceInfo = parseDeviceInfo(ua);

    const visitorName = await buildVisitorName(city, countryCode);

    const { data: created, error } = await supabase
      .from("guest_visitors")
      .insert({
        fingerprint,
        visitor_name: visitorName,
        city,
        country_code: countryCode,
        ip_masked: maskIp(ip),
        user_agent: ua ? ua.substring(0, 512) : null,
        metadata: {
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          in_app: deviceInfo.inApp,
        },
      })
      .select()
      .single();

    if (error || !created) {
      // Could be a race condition (unique constraint) — try fetching by fingerprint again
      const { data: retry } = await supabase
        .from("guest_visitors")
        .select("*")
        .eq("fingerprint", fingerprint)
        .maybeSingle();
      return (retry as GuestVisitorRecord | null) ?? null;
    }

    return created as GuestVisitorRecord;
  } catch {
    // Never let guest tracking errors bubble up to the user
    return null;
  }
}

// ─── Set Guest Cookie on Response ────────────────────────────────────────────

/**
 * Sets the guest ID cookie on a Response object.
 * Must be called AFTER the visitor record is created.
 */
export function setGuestCookie(
  cookies: ResponseCookies,
  guestId: string,
): void {
  cookies.set(GUEST_COOKIE_NAME, guestId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GUEST_COOKIE_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

// ─── Link Guest → User after registration ────────────────────────────────────

/**
 * When a guest visitor registers/logs in, link their history to the new user account.
 * Idempotent — safe to call multiple times.
 */
export async function linkGuestToUser(
  guestVisitorId: string,
  userId: string,
): Promise<void> {
  try {
    await Promise.all([
      // Mark the guest record as linked
      supabase
        .from("guest_visitors")
        .update({ linked_user_id: userId })
        .eq("id", guestVisitorId)
        .is("linked_user_id", null), // only if not already linked

      // Record the former guest ID on the user profile
      supabase
        .from("user_profiles")
        .update({ former_guest_visitor_id: guestVisitorId })
        .eq("user_id", userId)
        .is("former_guest_visitor_id", null), // only set once
    ]);
  } catch {
    // Non-critical — log silently
    console.error(
      JSON.stringify({ event: "guest_link_failure", guestVisitorId, userId })
    );
  }
}

// ─── Check if guest tracking is enabled ──────────────────────────────────────

export function isGuestTrackingEnabled(
  advancedSettings: Record<string, unknown> | undefined,
): boolean {
  return advancedSettings?.track_guest_sessions !== false; // default true
}
