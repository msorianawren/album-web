import { NextRequest, NextResponse } from "next/server";
import { getTrustedFounderDatabase } from "@/lib/db/admin";
import { encryptMetaToken } from "@/lib/meta/token-vault";
import { exchangeMetaCode, hashMetaOauthState } from "@/lib/meta/oauth";
import { isMetaConfigured } from "@/lib/meta/config";

const settingsUrl = new URL("/studio/settings?meta=callback", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");

function redirect(message: string) {
  const url = new URL(settingsUrl);
  url.searchParams.set("meta", message);
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const database = await getTrustedFounderDatabase(request);
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  if (!database || !isMetaConfigured() || !/^[A-Za-z0-9_-]{32,128}$/.test(state) || !code) return redirect("authorization_failed");
  const { data: pending } = await database.client.from("meta_oauth_states")
    .select("id,expires_at").eq("state_hash", hashMetaOauthState(state)).eq("actor_user_id", database.session.userId).maybeSingle();
  if (!pending || new Date(pending.expires_at).getTime() <= Date.now()) return redirect("authorization_expired");
  try {
    const token = await exchangeMetaCode(code);
    await database.client.from("meta_oauth_states").update({ encrypted_user_access_token: encryptMetaToken(token.access_token) }).eq("id", pending.id);
    const response = redirect("choose_page");
    response.cookies.set("meta_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
    return response;
  } catch {
    await database.client.from("meta_oauth_states").delete().eq("id", pending.id);
    return redirect("authorization_failed");
  }
}
