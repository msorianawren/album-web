import { NextRequest } from "next/server";
import { upsertUserProfile } from "@/lib/auth";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { createAnonSupabase } from "@/lib/supabase";

function safeNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = String(body.access_token ?? "");
    const refreshToken = String(body.refresh_token ?? "");
    const expiresIn = Number(body.expires_in ?? 3600);

    if (!accessToken || !refreshToken) {
      return apiError("INVALID_INPUT", "Missing Google session tokens.", 400);
    }

    const { data, error } = await createAnonSupabase().auth.getUser(accessToken);
    if (error || !data.user) {
      return apiError("UNAUTHENTICATED", "Invalid Google session.", 401);
    }

    if (data.user.app_metadata?.provider !== "google") {
      return apiError("FORBIDDEN", "Google login is required.", 403);
    }

    const profile = await upsertUserProfile(data.user);
    const next = profile?.is_blocked ? "/boycott" : safeNext(body.next);
    const response = apiSuccess({ next });

    response.cookies.set("sb-access-token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Number.isFinite(expiresIn) ? expiresIn : 3600,
    });
    response.cookies.set("sb-refresh-token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    return toServerError(error);
  }
}
