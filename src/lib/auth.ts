import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createAnonSupabase } from "@/lib/supabase";

function getAdminId() {
  return process.env.DEFAULT_OWNER_ID ?? "";
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

export async function getPublicSession(request?: NextRequest) {
  const user = await getCurrentUser(request);
  const adminId = getAdminId();

  return {
    userId: user?.id ?? null,
    isAdmin: Boolean(user?.id && adminId && user.id === adminId),
  };
}

export async function requireAdmin(request?: NextRequest) {
  const session = await getPublicSession(request);
  return session.isAdmin ? session : null;
}
