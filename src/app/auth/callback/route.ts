import { NextRequest, NextResponse } from "next/server";
import { upsertUserProfile } from "@/lib/auth";
import { clearAuthFlowCookies, getAuthFlow } from "@/lib/auth-flow";
import { createAnonSupabase } from "@/lib/supabase";

function setSessionCookies(response: NextResponse, session: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}) {
  response.cookies.set("sb-access-token", session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.expires_in,
  });
  response.cookies.set("sb-refresh-token", session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

function implicitCallbackPage(next: string, mode: string) {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Completing sign in...</title>
    <style>
      body {
        align-items: center;
        background: #f7f1e8;
        color: #241a14;
        display: flex;
        font-family: Inter, system-ui, sans-serif;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
      }
      main {
        max-width: 28rem;
        padding: 2rem;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Completing Google sign in...</h1>
      <p>Please wait a moment.</p>
    </main>
    <script>
      (async () => {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const error = hash.get("error_description") || hash.get("error");
        if (error) {
          window.location.replace("/login?error=" + encodeURIComponent(error));
          return;
        }

        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: hash.get("access_token"),
            refresh_token: hash.get("refresh_token"),
            expires_in: hash.get("expires_in"),
            next: ${JSON.stringify(next)},
            mode: ${JSON.stringify(mode)}
          })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          window.location.replace("/login?error=" + encodeURIComponent(payload?.message || "google_login_failed"));
          return;
        }
        window.location.replace(payload.data.next || "/");
      })();
    </script>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const { next, mode } = getAuthFlow(request);

  if (!code) {
    return implicitCallbackPage(next, mode);
  }

  const { data, error } = await createAnonSupabase().auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    return NextResponse.redirect(new URL("/login?error=google_login_failed", request.url));
  }

  const provider = data.user.app_metadata?.provider;
  if (provider !== "google") {
    return NextResponse.redirect(new URL("/login?error=google_required", request.url));
  }

  const profile = await upsertUserProfile(data.user);
  const target = profile?.is_blocked ? "/boycott" : next;
  const response = NextResponse.redirect(new URL(target, request.url));
  setSessionCookies(response, data.session);
  clearAuthFlowCookies(response);
  return response;
}
