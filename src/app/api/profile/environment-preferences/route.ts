import { NextRequest } from "next/server";
import { getUserProfile, requireUser } from "@/lib/auth";
import {
  getEnvironmentPreferencesFromMetadata,
  hasOnlyEnvironmentPreferenceKeys,
  mergeEnvironmentPreferencesIntoMetadata,
  normalizeEnvironmentPreferences,
} from "@/lib/environment/preferences";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser(request);
    if (!session?.userId) return apiError("UNAUTHENTICATED", "Login with Google is required.", 401);
    const profile = await getUserProfile(session.userId);
    return apiSuccess(
      { preferences: getEnvironmentPreferencesFromMetadata(profile?.metadata) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toServerError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireUser(request);
    if (!session?.userId) return apiError("UNAUTHENTICATED", "Login with Google is required.", 401);
    const body = await request.json().catch(() => null);
    if (!hasOnlyEnvironmentPreferenceKeys(body)) return apiError("INVALID_INPUT", "Unknown environment preference field.", 400);

    const preferences = normalizeEnvironmentPreferences(body);
    const profile = await getUserProfile(session.userId);
    const email = session.email ?? profile?.email;
    if (!email) return apiError("INVALID_INPUT", "A verified account email is required.", 400);

    const metadata = mergeEnvironmentPreferencesIntoMetadata(profile?.metadata, preferences);
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: session.userId,
        email,
        display_name: session.displayName ?? profile?.display_name ?? null,
        avatar_url: session.avatarUrl ?? profile?.avatar_url ?? null,
        provider: profile?.provider ?? "google",
        last_seen_at: new Date().toISOString(),
        metadata,
      }, { onConflict: "user_id" })
      .select("metadata")
      .single();
    if (error) return apiError("SERVER_ERROR", "Environment preferences could not be saved.", 500, { code: error.code });

    return apiSuccess(
      { preferences: getEnvironmentPreferencesFromMetadata(data?.metadata) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toServerError(error);
  }
}
