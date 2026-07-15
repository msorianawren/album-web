import "server-only";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAccessTokenFromRuntime } from "@/lib/auth-token";

function getUserClientConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing public Supabase configuration.");
  }

  return { url, anonKey };
}

export async function createAuthenticatedUserClient(request?: NextRequest) {
  const accessToken = await getAccessTokenFromRuntime(request);
  if (!accessToken) return null;

  const { url, anonKey } = getUserClientConfig();
  return createClient(url, anonKey, {
    accessToken: async () => accessToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
