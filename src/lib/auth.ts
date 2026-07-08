import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createAnonSupabase, supabase } from "@/lib/supabase";
import type { PublicSession, UserProfile, UserRole } from "@/lib/types";

function getAdminId() {
  return process.env.DEFAULT_OWNER_ID ?? "";
}

function normalizeRole(value: unknown): UserRole {
  return value === "founder" || value === "admin" || value === "user" ? value : "user";
}

function getEffectiveRole(userId: string | null | undefined, profile: UserProfile | null): UserRole {
  const adminId = getAdminId();
  if (userId && adminId && userId === adminId) return "founder";
  return normalizeRole(profile?.role);
}

function getUserDisplayName(user: User) {
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return typeof name === "string" && name.trim() ? name : null;
}

function getUserAvatarUrl(user: User) {
  const avatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  return typeof avatar === "string" && avatar.trim() ? avatar : null;
}

function getUserProvider(user: User) {
  const provider = user.app_metadata?.provider;
  return typeof provider === "string" && provider.trim() ? provider : "google";
}

function extractTokenFromCookieValue(value: string) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed?.access_token === "string") return parsed.access_token;
  } catch {
    // Supabase stores some cookie values as raw tokens and others as JSON.
  }

  return value.startsWith("eyJ") ? value : null;
}

async function getBearerTokenFromRuntime(request?: NextRequest) {
  const authHeader = request
    ? request.headers.get("authorization")
    : (await headers()).get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  const cookieStore = request ? request.cookies : await cookies();
  const tokenCookie =
    cookieStore.get("sb-access-token") ??
    cookieStore
      .getAll()
      .find((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));

  return tokenCookie ? extractTokenFromCookieValue(tokenCookie.value) : null;
}

export async function getCurrentUser(request?: NextRequest): Promise<User | null> {
  const token = await getBearerTokenFromRuntime(request);
  if (!token) return null;

  try {
    const supabase = createAnonSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function upsertUserProfile(user: User): Promise<UserProfile | null> {
  const email = user.email?.toLowerCase();
  if (!email) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        email,
        display_name: getUserDisplayName(user),
        avatar_url: getUserAvatarUrl(user),
        provider: getUserProvider(user),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function getPublicSession(request?: NextRequest): Promise<PublicSession> {
  const user = await getCurrentUser(request);
  const profile = user ? await upsertUserProfile(user) : null;
  const role = user ? getEffectiveRole(user.id, profile) : "guest";

  return {
    userId: user?.id ?? null,
    email: user?.email?.toLowerCase() ?? null,
    displayName: user ? getUserDisplayName(user) : null,
    avatarUrl: user ? getUserAvatarUrl(user) : null,
    role,
    isAdmin: role === "founder" || role === "admin",
    isFounder: role === "founder",
    isBlocked: Boolean(profile?.is_blocked),
    blockedReason: profile?.blocked_reason ?? null,
  };
}

export async function requireAdmin(request?: NextRequest) {
  const session = await getPublicSession(request);
  return session.isAdmin && !session.isBlocked ? session : null;
}

export async function requireFounder(request?: NextRequest) {
  const session = await getPublicSession(request);
  return session.isFounder && !session.isBlocked ? session : null;
}

export async function requireUser(request?: NextRequest) {
  const session = await getPublicSession(request);
  return session.userId && !session.isBlocked ? session : null;
}
