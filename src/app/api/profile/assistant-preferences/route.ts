import { NextRequest } from "next/server";
import { requireUser, getUserProfile } from "@/lib/auth";
import {
  getAssistantPreferencesFromMetadata,
  hasOnlyAssistantPreferenceKeys,
  mergeAssistantPreferencesIntoMetadata,
  normalizeAssistantPreferences,
} from "@/lib/assistant/preferences";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser(request);
    if (!session) {
      return apiError("UNAUTHENTICATED", "Login with Google is required.", 401);
    }

    const userId = session.userId;
    if (!userId) {
      return apiError("UNAUTHENTICATED", "Login with Google is required.", 401);
    }
    const profile = await getUserProfile(userId);
    return apiSuccess(
      {
        preferences: getAssistantPreferencesFromMetadata(profile?.metadata),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toServerError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireUser(request);
    if (!session) {
      return apiError("UNAUTHENTICATED", "Login with Google is required.", 401);
    }
    const userId = session.userId;
    if (!userId) {
      return apiError("UNAUTHENTICATED", "Login with Google is required.", 401);
    }

    const body = await request.json().catch(() => null);
    if (!hasOnlyAssistantPreferenceKeys(body)) {
      return apiError("INVALID_INPUT", "Unknown assistant preference field.", 400);
    }

    const preferences = normalizeAssistantPreferences(body);
    const profile = await getUserProfile(userId);
    const metadata = mergeAssistantPreferencesIntoMetadata(profile?.metadata, preferences);

    const { data, error } = await supabase
      .from("user_profiles")
      .update({ metadata })
      .eq("user_id", userId)
      .select("metadata")
      .single();

    if (error) {
      return apiError("SERVER_ERROR", error.message, 500);
    }

    return apiSuccess(
      {
        preferences: getAssistantPreferencesFromMetadata(data?.metadata),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return toServerError(error);
  }
}
