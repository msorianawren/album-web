import "server-only";
import { createClient } from "@supabase/supabase-js";

function getPublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing public Supabase configuration.");
  }

  return { url, anonKey };
}

let globalPublicClient: ReturnType<typeof createClient> | null = null;

export function createPublicServerClient() {
  if (globalPublicClient) return globalPublicClient;

  const { url, anonKey } = getPublicConfig();
  globalPublicClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return globalPublicClient;
}
