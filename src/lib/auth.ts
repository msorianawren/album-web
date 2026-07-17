import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getAccessTokenFromRuntime } from "@/lib/auth-token";
import { createPublicServerClient } from "@/lib/db/public";
import { supabase } from "@/lib/supabase";
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

export async function getCurrentUser(request?: NextRequest): Promise<User | null> {
  const token = await getAccessTokenFromRuntime(request);
  if (!token) return null;

  try {
    const supabase = createPublicServerClient();
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

  // Check if profile exists already
  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("registration_source")
    .eq("user_id", user.id)
    .maybeSingle();

  // If no registration_source is set, attempt to get it from cookie
  let source = existingProfile?.registration_source;
  if (!source) {
    const cookieStore = await cookies();
    source = cookieStore.get("signup_source")?.value || null;
  }

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
        ...(source ? { registration_source: source } : {}),
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
  const [profile, puzzleProfile] = user
    ? await Promise.all([
        upsertUserProfile(user),
        supabase
          .from("puzzle_user_profiles")
          .select("total_feathers")
          .eq("user_id", user.id)
          .maybeSingle(),
      ])
    : [null, { data: null, error: null }];
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
    wrenFeathers: Number(puzzleProfile.data?.total_feathers ?? 0),
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
