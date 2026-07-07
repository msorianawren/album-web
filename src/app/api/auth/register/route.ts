import { NextRequest } from "next/server";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { createAnonSupabase } from "@/lib/supabase";

function safeNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const redirectTo = new URL("/auth/callback", request.nextUrl.origin);
    redirectTo.searchParams.set("next", safeNext(body.next));
    redirectTo.searchParams.set("mode", "signup");

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
      return apiError("SERVER_ERROR", error?.message ?? "Google registration failed.", 500);
    }

    return apiSuccess({ url: data.url });
  } catch (error) {
    return toServerError(error);
  }
}
