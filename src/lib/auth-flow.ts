import { NextRequest, NextResponse } from "next/server";

const authNextCookie = "album-auth-next";
const authModeCookie = "album-auth-mode";

export function safeAuthNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export function safeAuthMode(value: unknown) {
  return value === "signup" ? "signup" : "login";
}

export function getAuthFlow(request: NextRequest) {
  return {
    next: safeAuthNext(request.cookies.get(authNextCookie)?.value),
    mode: safeAuthMode(request.cookies.get(authModeCookie)?.value),
  };
}

export function setAuthFlowCookies(
  response: NextResponse,
  { next, mode }: { next: string; mode: "login" | "signup" },
) {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  };

  response.cookies.set(authNextCookie, safeAuthNext(next), options);
  response.cookies.set(authModeCookie, safeAuthMode(mode), options);
}

export function clearAuthFlowCookies(response: NextResponse) {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(authNextCookie, "", options);
  response.cookies.set(authModeCookie, "", options);
}
