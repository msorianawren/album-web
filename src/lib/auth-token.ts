import "server-only";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { createAnonSupabase } from "@/lib/supabase";

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

export async function getAccessTokenFromRuntime(request?: NextRequest) {
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

  const accessToken = tokenCookie ? extractTokenFromCookieValue(tokenCookie.value) : null;
  if (accessToken) return accessToken;

  // Attempt automatic refresh if sb-access-token is missing/expired but sb-refresh-token is present
  const refreshTokenCookie = cookieStore.get("sb-refresh-token");
  const refreshToken = refreshTokenCookie?.value;
  if (!refreshToken) return null;

  try {
    const anonSupabase = createAnonSupabase();
    const { data, error } = await anonSupabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return null;

    const newAccessToken = data.session.access_token;
    const newRefreshToken = data.session.refresh_token;

    cookieStore.set("sb-access-token", newAccessToken);
    cookieStore.set("sb-refresh-token", newRefreshToken);

    return newAccessToken;
  } catch {
    return null;
  }
}
