import { NextRequest, NextResponse } from "next/server";
import { getTrustedAdminDatabase } from "@/lib/db/admin";
import { apiError, toServerError } from "@/lib/errors";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const database = await getTrustedAdminDatabase(request);
    if (!database) return apiError("FORBIDDEN", "Admin access required.", 403);
    const { client } = database;

    const { id: visitorId } = await params;

    // 1. Fetch visitor record
    const { data: visitor, error: visitorError } = await client
      .from("guest_visitors")
      .select("*")
      .eq("id", visitorId)
      .maybeSingle();

    if (visitorError) throw visitorError;
    if (!visitor) return apiError("NOT_FOUND", "Guest visitor not found.", 404);

    // 2. Fetch linked user email if linked
    let linkedUserEmail: string | null = null;
    if (visitor.linked_user_id) {
      const { data: userProfile } = await client
        .from("user_profiles")
        .select("email")
        .eq("user_id", visitor.linked_user_id)
        .maybeSingle();
      if (userProfile?.email) linkedUserEmail = userProfile.email;
    }

    // 3. Fetch guest album activity with album titles
    const { data: activityData, error: activityError } = await client
      .from("guest_album_activity")
      .select(`
        id, album_id, media_id, event_type, created_at, album_status_at_event, metadata, source,
        albums!guest_album_activity_album_id_fkey(title, slug, status)
      `)
      .eq("guest_visitor_id", visitorId)
      .order("created_at", { ascending: false });

    if (activityError) throw activityError;

    const activities = activityData ?? [];

    // Aggregates
    const viewedAlbumSet = new Set<string>();
    const downloadedAlbumSet = new Set<string>();
    let totalViewEvents = 0;
    let totalDownloadEvents = 0;
    let lastViewedAt: string | null = null;
    let lastDownloadedAt: string | null = null;

    const viewedMap = new Map<string, { album_id: string; title: string; count: number; last_at: string }>();
    const downloadedMap = new Map<string, { album_id: string; title: string; count: number; last_at: string }>();

    activities.forEach((act) => {
      // TypeScript cast for album join
      const albumObj = Array.isArray(act.albums) ? act.albums[0] : act.albums;
      const albumTitle = albumObj?.title ?? "Unknown Album";
      const albumId = act.album_id ?? "unknown";

      if (act.event_type === "album_viewed") {
        totalViewEvents++;
        if (!lastViewedAt) lastViewedAt = act.created_at;
        viewedAlbumSet.add(albumId);

        const current = viewedMap.get(albumId) ?? { album_id: albumId, title: albumTitle, count: 0, last_at: act.created_at };
        current.count++;
        viewedMap.set(albumId, current);
      } else if (act.event_type.startsWith("album_downloaded")) {
        totalDownloadEvents++;
        if (!lastDownloadedAt) lastDownloadedAt = act.created_at;
        downloadedAlbumSet.add(albumId);

        const current = downloadedMap.get(albumId) ?? { album_id: albumId, title: albumTitle, count: 0, last_at: act.created_at };
        current.count++;
        downloadedMap.set(albumId, current);
      }
    });

    // 4. Also fetch audit logs for this guest visitor (last 50)
    const { data: auditLogs } = await client
      .from("audit_logs")
      .select("*")
      .eq("guest_visitor_id", visitorId)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: {
        visitor: {
          ...visitor,
          linked_user_email: linkedUserEmail,
        },
        summary: {
          viewed_album_count: viewedAlbumSet.size,
          downloaded_album_count: downloadedAlbumSet.size,
          total_view_events: totalViewEvents,
          total_download_events: totalDownloadEvents,
          last_viewed_at: lastViewedAt,
          last_downloaded_at: lastDownloadedAt,
        },
        viewed_albums: Array.from(viewedMap.values()).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()),
        downloaded_albums: Array.from(downloadedMap.values()).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()),
        timeline: activities.slice(0, 30),
        audit_logs: auditLogs ?? [],
      },
    });
  } catch (error) {
    return toServerError(error);
  }
}
