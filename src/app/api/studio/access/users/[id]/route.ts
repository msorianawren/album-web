import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const p = await params;
    const userIdOrEmail = p.id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userIdOrEmail);

    let grantsQuery = supabase.from("album_access_grants").select(`
      id, scope, album_id, status, granted_at, revoked_at, revoke_reason, note,
      albums ( id, title ),
      granted_by_user:user_profiles!album_access_grants_granted_by_fkey ( display_name ),
      revoked_by_user:user_profiles!album_access_grants_revoked_by_fkey ( display_name )
    `).order("granted_at", { ascending: false });

    let requestsQuery = supabase.from("album_access_requests").select(`
      id, album_id, status, reason, created_at, albums ( id, title )
    `).order("created_at", { ascending: false });

    if (isUuid) {
      grantsQuery = grantsQuery.eq("user_id", userIdOrEmail);
      requestsQuery = requestsQuery.eq("requester_user_id", userIdOrEmail);
    } else {
      grantsQuery = grantsQuery.eq("email_normalized", userIdOrEmail);
      // access requests are bound to user_id, not email, so we might skip or check if user exists.
      requestsQuery = requestsQuery.eq("requester_user_id", "00000000-0000-0000-0000-000000000000"); // skip
    }

    const [{ data: grants, error: grantsError }, { data: requests, error: requestsError }] = await Promise.all([
      grantsQuery,
      requestsQuery
    ]);

    if (grantsError) return apiError("SERVER_ERROR", grantsError.message, 500);
    if (requestsError) return apiError("SERVER_ERROR", requestsError.message, 500);

    return apiSuccess({
      grants: grants || [],
      requests: requests || [],
    });

  } catch (error) {
    return toServerError(error);
  }
}
