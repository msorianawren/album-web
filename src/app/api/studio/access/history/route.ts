import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

type HistoryRow = {
  id: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  action: string;
  scope: "selected_albums" | "all_private" | null;
  request_id: string | null;
  grant_id: string | null;
  album_ids: string[] | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: NextRequest) {
  const adminSession = await requireAdmin(request);
  if (!adminSession) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1, 10000);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 25, 100);
    const action = searchParams.get("action");
    const search = searchParams.get("search")?.trim();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("album_access_history")
      .select("*", { count: "exact" });

    if (action && action !== "all") query = query.eq("action", action);
    if (search) {
      const term = `%${search.replace(/[%(),]/g, "")}%`;
      query = query.or(`target_email.ilike.${term},reason.ilike.${term}`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return apiError("SERVER_ERROR", error.message, 500);

    const rows = (data ?? []) as HistoryRow[];
    const albumIds = Array.from(new Set(rows.flatMap((row) => row.album_ids ?? [])));
    const userIds = Array.from(new Set(rows.flatMap((row) => [row.target_user_id, row.actor_user_id]).filter((id): id is string => Boolean(id))));

    const albumNames = new Map<string, string>();
    if (albumIds.length > 0) {
      const { data: albums } = await supabase.from("albums").select("id,title").in("id", albumIds);
      for (const album of albums ?? []) {
        albumNames.set(String(album.id), String(album.title ?? "Untitled album"));
      }
    }

    const users = new Map<string, { display_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id,display_name,email")
        .in("user_id", userIds);
      for (const profile of profiles ?? []) {
        users.set(String(profile.user_id), {
          display_name: profile.display_name ?? null,
          email: profile.email ?? null,
        });
      }
    }

    return apiSuccess({
      rows: rows.map((row) => ({
        ...row,
        target_user: row.target_user_id ? users.get(row.target_user_id) ?? null : null,
        actor_user: row.actor_user_id ? users.get(row.actor_user_id) ?? null : null,
        album_titles: (row.album_ids ?? []).map((albumId) => albumNames.get(albumId)).filter((title): title is string => Boolean(title)),
      })),
      pagination: {
        page,
        pageSize,
        totalRows: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
        hasNext: to < (count ?? 0) - 1,
        hasPrevious: page > 1,
      },
    });
  } catch (error) {
    return toServerError(error);
  }
}
