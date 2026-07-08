import type { NextRequest, NextResponse } from "next/server";

export const sessionCookieNames = {
  access: "sb-access-token",
  refresh: "sb-refresh-token",
} as const;

export const accessCookieFallbackMaxAge = 60 * 60;
export const rememberedBrowserMaxAge = 60 * 60 * 24 * 180;

export interface SessionCookiePayload {
  access_token: string;
  refresh_token: string;
  expires_in?: number | null;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function setSessionCookies(
  response: NextResponse,
  session: SessionCookiePayload,
  request?: NextRequest,
) {
  const accessMaxAge =
    Number.isFinite(session.expires_in) && Number(session.expires_in) > 0
      ? Number(session.expires_in)
      : accessCookieFallbackMaxAge;

  response.cookies.set(
    sessionCookieNames.access,
    session.access_token,
    cookieOptions(accessMaxAge),
  );
  response.cookies.set(
    sessionCookieNames.refresh,
    session.refresh_token,
    cookieOptions(rememberedBrowserMaxAge),
  );

  if (request) syncSessionRequestCookies(request, session);
}

export function clearSessionCookies(response: NextResponse, request?: NextRequest) {
  response.cookies.set(sessionCookieNames.access, "", cookieOptions(0));
  response.cookies.set(sessionCookieNames.refresh, "", cookieOptions(0));

  if (request) clearSessionRequestCookies(request);
}

export function syncSessionRequestCookies(
  request: NextRequest,
  session: SessionCookiePayload,
) {
  request.cookies.set(sessionCookieNames.access, session.access_token);
  request.cookies.set(sessionCookieNames.refresh, session.refresh_token);
}

export function clearSessionRequestCookies(request: NextRequest) {
  request.cookies.delete(sessionCookieNames.access);
  request.cookies.delete(sessionCookieNames.refresh);
}
