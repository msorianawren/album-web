import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getAdminProfile } from "@/lib/role-management";
import { supabase } from "@/lib/supabase";
import { apiError, toServerError } from "@/lib/errors";

export const runtime = "nodejs";

interface ActivityParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: ActivityParams) {
  try {
    await requireAdminUser(request);
    const { id: userId } = await params;

    const userProfile = await getAdminProfile(supabase, userId);
    if (!userProfile) return apiError("NOT_FOUND", "User not found", 404);

    // Get all activity for the user
    const { data: activityData, error: activityError } = await supabase
      .from("user_album_activity")
      .select(`
        id,
        album_id,
        media_id,
        event_type,
        created_at,
        album_status_at_event,
        metadata,
        albums!user_album_activity_album_id_fkey(title, slug, status)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (activityError) throw activityError;

    const activities = activityData || [];

    let viewedAlbumCount = 0;
    let downloadedAlbumCount = 0;
    let totalViewEvents = 0;
    let totalDownloadEvents = 0;
    let lastViewedAt: string | null = null;
    let lastDownloadedAt: string | null = null;

    interface AlbumStats {
      album_id: string;
      title: string;
      slug: string;
      status: string;
      first_viewed_at?: string;
      last_viewed_at?: string;
      view_count?: number;
      download_type?: string;
      download_count?: number;
      last_downloaded_at?: string;
    }

    const viewedAlbumsMap = new Map<string, AlbumStats>();
    const downloadedAlbumsMap = new Map<string, AlbumStats>();

    const timeline = [];

    for (const event of activities) {
      const albumData = Array.isArray(event.albums) ? event.albums[0] : event.albums;
      const albumTitle = albumData?.title ?? "Unknown Album";
      const albumSlug = albumData?.slug ?? "";
      const currentStatus = albumData?.status ?? event.album_status_at_event ?? "unknown";

      if (timeline.length < 20) {
        timeline.push({
          id: event.id,
          event_type: event.event_type,
          album_id: event.album_id,
          album_title: albumTitle,
          album_slug: albumSlug,
          created_at: event.created_at,
          result: event.metadata?.result ?? "success",
          reason_code: event.metadata?.reason_code,
        });
      }

      if (event.event_type === "album_viewed") {
        totalViewEvents++;
        if (!lastViewedAt) lastViewedAt = event.created_at;
        
        if (!viewedAlbumsMap.has(event.album_id)) {
          viewedAlbumsMap.set(event.album_id, {
            album_id: event.album_id,
            title: albumTitle,
            slug: albumSlug,
            status: currentStatus,
            first_viewed_at: event.created_at,
            last_viewed_at: event.created_at,
            view_count: 1,
          });
          viewedAlbumCount++;
        } else {
          const a = viewedAlbumsMap.get(event.album_id)!;
          a.view_count = (a.view_count ?? 1) + 1;
          a.first_viewed_at = event.created_at; // since we iterate desc, this becomes earliest
        }
      } else if (event.event_type.startsWith("album_downloaded")) {
        totalDownloadEvents++;
        if (!lastDownloadedAt) lastDownloadedAt = event.created_at;
        
        if (!downloadedAlbumsMap.has(event.album_id)) {
          downloadedAlbumsMap.set(event.album_id, {
            album_id: event.album_id,
            title: albumTitle,
            slug: albumSlug,
            status: currentStatus,
            download_type: event.event_type === "album_downloaded_zip" ? "ZIP" : "Media",
            download_count: 1,
            last_downloaded_at: event.created_at,
          });
          downloadedAlbumCount++;
        } else {
          const a = downloadedAlbumsMap.get(event.album_id)!;
          a.download_count = (a.download_count ?? 1) + 1;
        }
      }
    }

    const viewed_albums = Array.from(viewedAlbumsMap.values()).sort((a, b) => 
      new Date(b.last_viewed_at!).getTime() - new Date(a.last_viewed_at!).getTime()
    );

    const downloaded_albums = Array.from(downloadedAlbumsMap.values()).sort((a, b) => 
      new Date(b.last_downloaded_at!).getTime() - new Date(a.last_downloaded_at!).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userProfile.user_id,
          name: userProfile.display_name,
          email: userProfile.email,
          role: userProfile.role,
          status: userProfile.is_blocked ? "blocked" : "active",
          source: userProfile.registration_source,
          last_seen_at: userProfile.last_seen_at,
          created_at: userProfile.created_at,
        },
        summary: {
          viewed_album_count: viewedAlbumCount,
          downloaded_album_count: downloadedAlbumCount,
          total_view_events: totalViewEvents,
          total_download_events: totalDownloadEvents,
          last_viewed_at: lastViewedAt,
          last_downloaded_at: lastDownloadedAt,
        },
        viewed_albums,
        downloaded_albums,
        timeline,
      }
    });
  } catch (error) {
    return toServerError(error);
  }
}
