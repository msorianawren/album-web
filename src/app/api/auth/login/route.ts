import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { createAnonSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const next = typeof body.next === "string" ? body.next : "/";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    const redirectTo = new URL("/auth/callback", request.nextUrl.origin);
    redirectTo.searchParams.set("next", safeNext);

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

    return apiSuccess({ url: data.url });
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
