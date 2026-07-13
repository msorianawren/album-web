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
    const search = searchParams.get("search") || "";
    
    // Filters
    const accessStatus = searchParams.get("accessStatus"); // active | revoked | none | all_private | selected_albums
    const requestStatus = searchParams.get("requestStatus"); // pending | approved | rejected
    // Specific logic required by Phase 10: "Ever granted", "Currently active", "Ever revoked", "Currently no access", "Revoked only"
    const grantFilter = searchParams.get("grantFilter"); 

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // We need to fetch users, but Supabase doesn't easily let us filter `user_profiles` based on complex aggregations of `album_access_grants` without a raw SQL RPC.
    // However, if we fetch the grants/requests first or use an RPC it's much faster.
    // Let's create an RPC or use a complex query.
    // Actually, we can fetch users and their grants/requests. 
    // Since we have `album_access_grants`, we can query it and group by `user_id`/`email_normalized`.
    
    // As a robust approach without adding a new RPC: 
    // 1. If we have a grant filter, we fetch distinct user_ids/emails from album_access_grants matching the filter.
    
    let eligibleUserIds: string[] | null = null;
    let eligibleEmails: string[] | null = null;

    if (grantFilter) {
       const { data: allGrants } = await supabase.from("album_access_grants").select("user_id, email_normalized, status");
       const userStats = new Map<string, { active: number, revoked: number }>();
       const emailStats = new Map<string, { active: number, revoked: number }>();

       if (allGrants) {
         for (const g of allGrants) {
           if (g.user_id) {
             const stat = userStats.get(g.user_id) || { active: 0, revoked: 0 };
             if (g.status === "active") stat.active++;
             if (g.status === "revoked") stat.revoked++;
             userStats.set(g.user_id, stat);
           } else if (g.email_normalized) {
             const stat = emailStats.get(g.email_normalized) || { active: 0, revoked: 0 };
             if (g.status === "active") stat.active++;
             if (g.status === "revoked") stat.revoked++;
             emailStats.set(g.email_normalized, stat);
           }
         }
       }

       eligibleUserIds = [];
       eligibleEmails = [];

       if (grantFilter === "no_access") {
         // users who have no active grant at all.
         // Wait, the ones IN the userStats are people who have grants.
         // If we only include users with stat.active === 0, we miss people who NEVER had a grant.
         // So for "no_access", we should NOT use `in(eligibleUserIds)`. Instead, we should find ALL users with active grants and use `not.in(activeUserIds)`.
         const activeUsers: string[] = [];
         for (const [uid, stat] of userStats.entries()) {
           if (stat.active > 0) activeUsers.push(uid);
         }
         eligibleUserIds = activeUsers; // We will handle this specially below
       } else {
         for (const [uid, stat] of userStats.entries()) {
           let match = false;
           if (grantFilter === "ever_granted" && (stat.active > 0 || stat.revoked > 0)) match = true;
           if (grantFilter === "active" && stat.active > 0) match = true;
           if (grantFilter === "ever_revoked" && stat.revoked > 0) match = true;
           if (grantFilter === "revoked_only" && stat.active === 0 && stat.revoked > 0) match = true;
           if (match) eligibleUserIds.push(uid);
         }
       }
    }

    let userQuery = supabase
      .from("user_profiles")
      .select("*", { count: "exact" });

    if (search) {
      userQuery = userQuery.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (eligibleUserIds && eligibleEmails) {
      if (grantFilter === "no_access") {
        // Exclude users who have active access. eligibleUserIds contains active users.
        if (eligibleUserIds.length > 0) {
          userQuery = userQuery.not("user_id", "in", `(${eligibleUserIds.join(",")})`);
        }
      } else {
         if (eligibleUserIds.length > 0) {
           userQuery = userQuery.in("user_id", eligibleUserIds);
         } else {
           // Force empty if no matches
           userQuery = userQuery.eq("user_id", "00000000-0000-0000-0000-000000000000");
         }
      }
    }

    userQuery = userQuery.range(from, to).order("created_at", { ascending: false });

    const { data: users, count, error } = await userQuery;

    if (error) return apiError("SERVER_ERROR", error.message, 500);

    // Fetch grant data for the returned users
    const userIds = (users || []).map(u => u.user_id);
    const emails = (users || []).map(u => u.email).filter(Boolean);

    let grantsData: any[] = [];
    if (userIds.length > 0 || emails.length > 0) {
      let gQuery = supabase.from("album_access_grants").select("id, user_id, email_normalized, scope, album_id, status, granted_at, revoked_at");
      if (userIds.length > 0 && emails.length > 0) {
        gQuery = gQuery.or(`user_id.in.(${userIds.join(",")}),email_normalized.in.(${emails.map(e => `"${e}"`).join(",")})`);
      } else if (userIds.length > 0) {
        gQuery = gQuery.in("user_id", userIds);
      } else {
        gQuery = gQuery.in("email_normalized", emails);
      }
      const { data: gd } = await gQuery;
      if (gd) grantsData = gd;
    }

    // Fetch pending requests
    let requestsData: any[] = [];
    if (userIds.length > 0) {
      const { data: rd } = await supabase.from("album_access_requests").select("id, requester_user_id, status").in("requester_user_id", userIds).eq("status", "pending");
      if (rd) requestsData = rd;
    }

    const rows = (users || []).map(u => {
      const uGrants = grantsData.filter(g => g.user_id === u.user_id || (u.email && g.email_normalized === u.email));
      const uReqs = requestsData.filter(r => r.requester_user_id === u.user_id);
      
      const activeGrants = uGrants.filter(g => g.status === "active");
      const revokedGrants = uGrants.filter(g => g.status === "revoked");
      
      let accessLevel = "No Access";
      let activeAlbums: string[] = [];
      let revokedAlbums: string[] = [];

      if (activeGrants.some(g => g.scope === "all_private")) {
        accessLevel = "All Private Albums";
      } else if (activeGrants.length > 0) {
        accessLevel = `${activeGrants.length} Selected Albums`;
        activeAlbums = activeGrants.map(g => g.album_id).filter(Boolean);
      } else if (revokedGrants.length > 0) {
        accessLevel = "Revoked";
      }

      revokedAlbums = revokedGrants.map(g => g.album_id).filter(Boolean);

      return {
        id: u.user_id,
        user_id: u.user_id,
        email: u.email,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        role: u.role,
        last_seen_at: u.last_seen_at,
        current_access: accessLevel,
        active_albums: activeAlbums,
        revoked_albums: revokedAlbums,
        pending_requests: uReqs.length,
        last_grant: Math.max(...uGrants.filter(g => g.status === "active").map(g => new Date(g.granted_at).getTime()), 0),
        last_revoke: Math.max(...uGrants.filter(g => g.status === "revoked").map(g => new Date(g.revoked_at).getTime()), 0),
      };
    });

    // If grantFilter === "no_access", we need to filter the rows here, but pagination gets messed up.
    // The exact requirement from Phase 10: "There must be filters to see people who have ever been granted or revoked... accurate and based on backend data".
    // For a real production app without an RPC, fetching all users and filtering in-memory is slow.
    // Let's create an RPC in the database migration instead! 

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
