import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { z } from "zod";
import { decideAccessRequest, maskPhone, resolveRequestedAlbumIds, type AccessRequestDecision } from "@/lib/access-request-workflow";

type AccessRequestListRow = {
  id: string;
  album_id: string | null;
  requester_user_id: string | null;
  requester_email: string | null;
  requester_name: string | null;
  full_name: string | null;
  requester_phone: string | null;
  phone_normalized: string | null;
  reason: string | null;
  status: string;
  scope: "selected_albums" | "all_private" | null;
  requested_album_ids: string[] | null;
  review_note: string | null;
  auto_approve_at: string | null;
  risk_flags: Record<string, boolean> | null;
  created_at: string;
  albums?: { title?: string | null; slug?: string | null } | null;
};

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  status: z.enum(["approved", "denied", "rejected", "needs_manual_review"]),
  note: z.string().trim().max(1000).optional().nullable(),
});

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function normalizeStatus(value: string | null) {
  if (!value || value === "all") return null;
  return value === "rejected" ? "denied" : value;
}

export async function GET(request: NextRequest) {
  const adminSession = await requireAdmin(request);
  if (!adminSession) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1, 10000);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 25, 100);
    const rawStatus = searchParams.get("status");
    const status = rawStatus === "all" ? "all" : normalizeStatus(rawStatus) ?? "pending";
    const scope = searchParams.get("scope");
    const search = searchParams.get("search")?.trim();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("album_access_requests")
      .select("*, albums(title, slug)", { count: "exact" });

    if (status !== "all") query = query.eq("status", status);
    if (scope === "selected_albums" || scope === "all_private") query = query.eq("scope", scope);
    if (search) {
      const term = `%${search.replace(/[%(),]/g, "")}%`;
      query = query.or(
        `requester_email.ilike.${term},requester_name.ilike.${term},full_name.ilike.${term},reason.ilike.${term},phone_normalized.ilike.${term}`,
      );
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return apiError("SERVER_ERROR", error.message, 500);
    }

    const rows = (data ?? []) as AccessRequestListRow[];
    const requestedIds = Array.from(
      new Set(
        rows.flatMap((row) => resolveRequestedAlbumIds(row)),
      ),
    );

    const albumNames = new Map<string, string>();
    if (requestedIds.length > 0) {
      const { data: albums } = await supabase
        .from("albums")
        .select("id,title")
        .in("id", requestedIds);
      for (const album of albums ?? []) {
        albumNames.set(String(album.id), String(album.title ?? "Untitled album"));
      }
    }

    const requests = rows.map((row) => {
      const albumIds = resolveRequestedAlbumIds(row);
      const albumTitles =
        row.scope === "all_private"
          ? []
          : albumIds.map((albumId) => albumNames.get(albumId)).filter((title): title is string => Boolean(title));
      const phone = row.phone_normalized ?? row.requester_phone;

      return {
        ...row,
        display_name: row.full_name ?? row.requester_name,
        album_ids: albumIds,
        album_titles: albumTitles.length ? albumTitles : row.albums?.title ? [row.albums.title] : [],
        album_count: row.scope === "all_private" ? null : albumIds.length,
        requester_phone_masked: maskPhone(phone),
        requester_phone: adminSession.isFounder ? phone : maskPhone(phone),
      };
    });

    return apiSuccess({
      requests,
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

export async function PATCH(request: NextRequest) {
  const adminSession = await requireAdmin(request);
  if (!adminSession) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid payload.", 400, parsed.error.flatten());
    }

    const decision = (parsed.data.status === "rejected" ? "denied" : parsed.data.status) as AccessRequestDecision;
    const results = [];
    for (const id of parsed.data.ids) {
      const result = await decideAccessRequest({
        requestId: id,
        decision,
        actorSession: adminSession,
        note: parsed.data.note ?? null,
        request,
      });
      results.push({ id, ok: result.ok, status: result.status });
    }

    return apiSuccess({
      results,
      approved: results.filter((result) => result.status === "approved").length,
      denied: results.filter((result) => result.status === "denied").length,
      skipped: results.filter((result) => result.status === "skipped").length,
    });
  } catch (error) {
    return toServerError(error);
  }
}
