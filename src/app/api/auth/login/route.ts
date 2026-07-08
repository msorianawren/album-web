import { NextRequest, NextResponse } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { safeAuthNext, setAuthFlowCookies } from "@/lib/auth-flow";
import { clearSessionCookies, sessionCookieNames } from "@/lib/session-cookies";
import { createAnonSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const redirectTo = new URL("/auth/callback", request.nextUrl.origin);
    const next = safeAuthNext(body.next);

    const { data, error } = await createAnonSupabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: {
          access_type: "offline",
          include_granted_scopes: "true",
        },
      },
    });

    if (error || !data.url) {
      return apiError("SERVER_ERROR", error?.message ?? "Google login failed.", 500);
    }

    const response = apiSuccess({ url: data.url });
    setAuthFlowCookies(response, { next, mode: "login" });
    return response;
  } catch (error) {
    return toServerError(error);
  }
}

async function revokeBrowserSession(refreshToken: string) {
  const client = createAnonSupabase();
  const { data } = await client.auth.refreshSession({ refresh_token: refreshToken });

  if (data.session) {
    await client.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    await client.auth.signOut();
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  const session = await getPublicSession(request);
  const refreshToken = request.cookies.get(sessionCookieNames.refresh)?.value;

  if (session.userId) {
    await logAuditEvent({
      request,
      session,
      action: "user_signed_out",
      targetType: "user",
      targetId: session.userId,
    });
  }

  if (refreshToken) {
    await revokeBrowserSession(refreshToken).catch(() => null);
  }

  clearSessionCookies(response);
  return response;
}
