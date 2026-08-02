import { NextRequest } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const database = await getTrustedAdminDatabase(request);
  if (!database) return apiError("FORBIDDEN", "Admin access required.", 403);
  const { client } = database;

  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 30));
    const filter = request.nextUrl.searchParams.get("filter") ?? "all"; // 'all' | 'active' | 'linked'
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const offset = (page - 1) * limit;

    let query = client
      .from("guest_visitors")
      .select("*", { count: "exact" })
      .order("last_seen_at", { ascending: false });

    if (filter === "active") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("last_seen_at", sevenDaysAgo);
    } else if (filter === "linked") {
      query = query.not("linked_user_id", "is", null);
    }

    if (search) {
      query = query.or(`visitor_name.ilike.%${search}%,city.ilike.%${search}%,ip_masked.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: rawVisitors, count, error } = await query;
    if (error) throw error;

    const visitors = rawVisitors ?? [];

    if (visitors.length === 0) {
      return apiSuccess(
        { visitors: [], count: 0, page, limit },
        { headers: noStore },
      );
    }

    const visitorIds = visitors.map((v) => v.id);
    const linkedUserIds = visitors
      .map((v) => v.linked_user_id)
      .filter((id): id is string => Boolean(id));

    // Batch query 1: Fetch linked user emails in one query
    const emailMap = new Map<string, string>();
    if (linkedUserIds.length > 0) {
      const { data: userProfiles } = await client
        .from("user_profiles")
        .select("user_id, email")
        .in("user_id", linkedUserIds);

      userProfiles?.forEach((u) => {
        if (u.user_id && u.email) emailMap.set(u.user_id, u.email);
      });
    }

    // Batch query 2: Fetch all activity counts for these visitors in one batch query
    const statsMap = new Map<
      string,
      { viewCount: number; downloadCount: number; albumIds: Set<string> }
    >();

    const { data: activities } = await client
      .from("guest_album_activity")
      .select("guest_visitor_id, event_type, album_id")
      .in("guest_visitor_id", visitorIds);

    activities?.forEach((act) => {
      let stats = statsMap.get(act.guest_visitor_id);
      if (!stats) {
        stats = { viewCount: 0, downloadCount: 0, albumIds: new Set() };
        statsMap.set(act.guest_visitor_id, stats);
      }
      if (act.event_type === "album_viewed") {
        stats.viewCount++;
      } else if (act.event_type.includes("download")) {
        stats.downloadCount++;
      }
      if (act.album_id) {
        stats.albumIds.add(act.album_id);
      }
    });

    const enrichedVisitors = visitors.map((v) => {
      const stats = statsMap.get(v.id) ?? { viewCount: 0, downloadCount: 0, albumIds: new Set() };
      return {
        ...v,
        linked_user_email: v.linked_user_id ? (emailMap.get(v.linked_user_id) ?? null) : null,
        view_count: stats.viewCount,
        download_count: stats.downloadCount,
        album_count: stats.albumIds.size,
      };
    });

    return apiSuccess(
      { visitors: enrichedVisitors, count: count ?? 0, page, limit },
      { headers: noStore },
    );
  } catch (error) {
    return toServerError(error, request, "api.admin.guest_visitors");
  }
}
