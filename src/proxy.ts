import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import {
  clearSessionCookies,
  clearSessionRequestCookies,
  sessionCookieNames,
  setSessionCookies,
  syncSessionRequestCookies,
  type SessionCookiePayload,
} from "@/lib/session-cookies";
import { getRequestIpWhois } from "@/lib/request-info";
import { jwtVerify } from "jose";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET || "";
const adminId = process.env.DEFAULT_OWNER_ID ?? "";

const ALLOWED_HOSTS = new Set(["orianawren.com", "www.orianawren.com"]);
const VERCEL_PREVIEW_HOSTS = new Set(
  [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase()),
);



function getAccessToken(request: NextRequest) {
  return request.cookies.get(sessionCookieNames.access)?.value ?? null;
}

function getRefreshToken(request: NextRequest) {
  return request.cookies.get(sessionCookieNames.refresh)?.value ?? null;
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function rateLimit(request: NextRequest) {
  // Rate limiting should be handled by Cloudflare WAF or Vercel KV.
  // In-memory rate limiting is ineffective in edge environments.
  return false;
}

function isUnsafeMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function hasCrossOriginMutation(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api") || !isUnsafeMethod(request.method)) {
    return false;
  }

  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) return true; // Block if origin AND referer are missing on mutation

  try {
    return new URL(origin).host !== request.nextUrl.host;
  } catch {
    return true;
  }
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/albums") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/games") ||
    pathname === "/profile" ||
    pathname === "/boycott" ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/session") ||
    pathname.startsWith("/api/albums") ||
    pathname.startsWith("/api/media") ||
    pathname.startsWith("/api/comments") ||
    pathname.startsWith("/api/likes") ||
    pathname.startsWith("/api/search")
  );
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

function redirectToBoycott(request: NextRequest) {
  return NextResponse.redirect(new URL("/boycott", request.url));
}

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, code, message }, { status });
}



async function logRequest(request: NextRequest, user: User) {
  if (!serviceRoleKey || !supabaseUrl) return;

  const path = request.nextUrl.pathname;
  const method = request.method;
  const isMutatingApi = path.startsWith("/api") && method !== "GET";
  const isDownload = path.includes("/download");

  if (!isMutatingApi && !isDownload) return;
  if (user.id === adminId) return; // Ignore actions by the admin founder

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email?.toLowerCase() ?? null,
    action: isDownload ? "download" : "api_action",
    target_type: path.startsWith("/api") ? "api" : "page",
    path,
    method,
    ip_address: getClientIp(request),
    user_agent: request.headers.get("user-agent"),
    metadata: {
      search: request.nextUrl.search,
      is_admin: user.id === adminId,
      ip_info: getRequestIpWhois(request),
    },
  });
}

async function logProxyBlock(request: NextRequest, action: string) {
  if (!serviceRoleKey || !supabaseUrl) return;

  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_user_id: null,
    actor_email: null,
    action,
    target_type: request.nextUrl.pathname.startsWith("/api") ? "api" : "page",
    path: request.nextUrl.pathname,
    method: request.method,
    ip_address: getClientIp(request),
    user_agent: request.headers.get("user-agent"),
    metadata: {
      search: request.nextUrl.search,
      ip_info: getRequestIpWhois(request),
    },
  });
}

type AuthResolution =
  | {
      user: User;
      refreshedSession?: SessionCookiePayload;
    }
  | {
      shouldClearCookies: true;
    }
  | null;

function createAuthClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveAuthenticatedUser(request: NextRequest): Promise<AuthResolution> {
  if (!supabaseUrl || !anonKey) return null;

  const auth = createAuthClient();
  const token = getAccessToken(request);
  const refreshToken = getRefreshToken(request);

  if (token) {
    if (supabaseJwtSecret) {
      try {
        const secret = new TextEncoder().encode(supabaseJwtSecret);
        const { payload } = await jwtVerify(token, secret);
        
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          const user = {
            id: payload.sub as string,
            email: payload.email as string,
            user_metadata: payload.user_metadata as Record<string, unknown>,
            app_metadata: payload.app_metadata as { provider?: string; [key: string]: unknown },
            aud: payload.aud as string,
            created_at: "",
            role: payload.role as string,
          } as User;
          return { user };
        }
      } catch {
        // Fallthrough to refresh if verification fails
      }
    } else {
      const { data, error } = await auth.auth.getUser(token);
      if (!error && data.user) return { user: data.user };
    }
  }

  if (!refreshToken) {
    return token ? { shouldClearCookies: true } : null;
  }

  const { data, error } = await auth.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) {
    return { shouldClearCookies: true };
  }

  return {
    user: data.user,
    refreshedSession: data.session,
  };
}

function responseNext(request: NextRequest, refreshedSession?: SessionCookiePayload) {
  if (refreshedSession) {
    syncSessionRequestCookies(request, refreshedSession);
  }

  const response = NextResponse.next(
    refreshedSession ? { request: { headers: request.headers } } : undefined,
  );

  if (refreshedSession) {
    setSessionCookies(response, refreshedSession);
  }

  return response;
}

function responseRedirect(
  request: NextRequest,
  target: string,
  refreshedSession?: SessionCookiePayload,
) {
  const response = NextResponse.redirect(new URL(target, request.url));
  if (refreshedSession) setSessionCookies(response, refreshedSession);
  return response;
}

function responseUnauthenticated(request: NextRequest, clearCookies: boolean) {
  const response = request.nextUrl.pathname.startsWith("/api")
    ? apiError("UNAUTHENTICATED", "Login with Google is required.", 401)
    : redirectToLogin(request);

  if (clearCookies) {
    clearSessionRequestCookies(request);
    clearSessionCookies(response);
  }

  return response;
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  const isTrustedVercelPreview =
    process.env.VERCEL_ENV === "preview" && VERCEL_PREVIEW_HOSTS.has(host);

  if (
    process.env.NODE_ENV === "production"
    && !isLocal
    && !ALLOWED_HOSTS.has(host)
    && !isTrustedVercelPreview
  ) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = "www.orianawren.com";
    return NextResponse.redirect(url, 308);
  }

  const pathname = request.nextUrl.pathname;

  if (rateLimit(request)) {
    event.waitUntil(logProxyBlock(request, "proxy_rate_limit_blocked"));
    return pathname.startsWith("/api")
      ? apiError("RATE_LIMITED", "Too many requests.", 429)
      : new NextResponse("Too many requests.", { status: 429 });
  }

  if (hasCrossOriginMutation(request)) {
    event.waitUntil(logProxyBlock(request, "csrf_origin_blocked"));
    return apiError("FORBIDDEN", "Cross-origin mutation requests are not allowed.", 403);
  }

  if (isPublicPath(pathname)) return NextResponse.next();

  const authResolution = await resolveAuthenticatedUser(request);

  if (!authResolution) {
    return pathname === "/login" ? NextResponse.next() : responseUnauthenticated(request, false);
  }

  if ("shouldClearCookies" in authResolution) {
    if (pathname === "/login") {
      const response = NextResponse.next();
      clearSessionRequestCookies(request);
      clearSessionCookies(response);
      return response;
    }

    return responseUnauthenticated(request, true);
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("is_blocked")
    .eq("user_id", authResolution.user.id)
    .maybeSingle();

  if (pathname === "/login") {
    return profile?.is_blocked
      ? responseRedirect(request, "/boycott", authResolution.refreshedSession)
      : responseRedirect(
          request,
          safeNextPath(request.nextUrl.searchParams.get("next")),
          authResolution.refreshedSession,
        );
  }

  if (profile?.is_blocked && pathname !== "/boycott") {
    const response = pathname.startsWith("/api")
      ? apiError("FORBIDDEN", "This account has been blocked by the admin.", 403)
      : redirectToBoycott(request);
    if (authResolution.refreshedSession) {
      setSessionCookies(response, authResolution.refreshedSession);
    }
    return response;
  }

  event.waitUntil(logRequest(request, authResolution.user));
  return responseNext(request, authResolution.refreshedSession);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|map|txt|xml|json|webmanifest|mp3|wav|ogg|m4a)$).*)",
  ],
};
