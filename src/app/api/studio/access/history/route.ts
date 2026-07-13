import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);
    
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // We can fetch from album_access_grants ordered by updated_at or granted_at/revoked_at
    const { data: grants, count, error } = await supabase
      .from("album_access_grants")
      .select(`
        id, user_id, email_normalized, scope, status,
        granted_at, revoked_at, revoke_reason, note,
        albums ( id, title ),
        granted_by_user:user_profiles!album_access_grants_granted_by_fkey ( display_name, email ),
        revoked_by_user:user_profiles!album_access_grants_revoked_by_fkey ( display_name, email ),
        target_user:user_profiles!album_access_grants_user_id_fkey ( display_name, email, avatar_url )
      `, { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) return apiError("SERVER_ERROR", error.message, 500);

    const rows = (grants || []).map((g: any) => ({
      id: g.id,
      user_id: g.user_id,
      email: g.email_normalized || g.target_user?.email,
      display_name: g.target_user?.display_name,
      avatar_url: g.target_user?.avatar_url,
      scope: g.scope,
      status: g.status,
      album: g.albums,
      granted_at: g.granted_at,
      granted_by: g.granted_by_user?.display_name || g.granted_by_user?.email,
      revoked_at: g.revoked_at,
      revoked_by: g.revoked_by_user?.display_name || g.revoked_by_user?.email,
      reason: g.revoke_reason || g.note,
    }));

    return apiSuccess({
      rows,
      pagination: {
        page,
        pageSize,
        totalRows: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasNext: to < (count || 0) - 1,
        hasPrevious: page > 1,
      }
    });

  } catch (error) {
    return toServerError(error);
  }
}
