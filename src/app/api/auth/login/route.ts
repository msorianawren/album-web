import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { safeAuthNext, setAuthFlowCookies } from "@/lib/auth-flow";
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
          prompt: "consent",
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

export async function DELETE() {
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  response.cookies.set("sb-access-token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("sb-refresh-token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
