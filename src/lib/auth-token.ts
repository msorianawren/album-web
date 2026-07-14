import "server-only";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";

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

  return tokenCookie ? extractTokenFromCookieValue(tokenCookie.value) : null;
}
