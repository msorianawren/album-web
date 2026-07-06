import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { createAnonSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");

    if (!email || !password) {
      return apiError("INVALID_INPUT", "Email and password are required.", 400);
    }

    const supabase = createAnonSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return apiError("UNAUTHENTICATED", "Invalid login credentials.", 401);
    }

    const response = apiSuccess({ user: data.user });
    response.cookies.set("sb-access-token", data.session.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: data.session.expires_in,
    });

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
  return response;
}
