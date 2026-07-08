import { NextRequest } from "next/server";
import { upsertUserProfile } from "@/lib/auth";
import { clearAuthFlowCookies } from "@/lib/auth-flow";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { setSessionCookies } from "@/lib/session-cookies";
import { createAnonSupabase, supabase } from "@/lib/supabase";

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
    const mode = body.mode === "signup" ? "signup" : "login";

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

    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    const profile = await upsertUserProfile(data.user);
    const isNewUser = !existingProfile;

    await supabase.from("audit_logs").insert({
      actor_user_id: data.user.id,
      actor_email: data.user.email?.toLowerCase() ?? null,
      action: isNewUser || mode === "signup" ? "user_registered" : "user_signed_in",
      target_type: "user",
      target_id: data.user.id,
      path: request.nextUrl.pathname,
      method: request.method,
      ip_address:
        request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
      metadata: { mode, is_new_user: isNewUser },
    });

    const next = profile?.is_blocked ? "/boycott" : safeNext(body.next);
    const response = apiSuccess({ next, isNewUser });

    setSessionCookies(response, {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    });
    clearAuthFlowCookies(response);

    return response;
  } catch (error) {
    return toServerError(error);
  }
}
