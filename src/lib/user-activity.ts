import "server-only";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPublicSession } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import type { PublicSession } from "@/lib/types";

export type AlbumEventType =
  | "album_viewed"
  | "album_downloaded_zip"
  | "album_downloaded_media"
  | "album_access_requested"
  | "album_access_approved"
  | "album_access_rejected";

interface RecordActivityProps {
  request: NextRequest;
  session?: PublicSession;
  albumId: string;
  mediaId?: string | null;
  eventType: AlbumEventType;
  albumStatus?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordUserAlbumActivity({
  request,
  session: providedSession,
  albumId,
  mediaId,
  eventType,
  albumStatus,
  source,
  metadata = {},
}: RecordActivityProps) {
  const session = providedSession ?? (await getPublicSession(request));
  if (!session.userId) return; // Only track authenticated users

  const settings = await getSiteSettings();

  // Check tracking toggles
  const advanced = settings.advanced_settings as Record<string, unknown> | undefined;
  if (eventType === "album_viewed" && advanced?.track_album_views === false) return;
  if (eventType.includes("download") && advanced?.track_album_downloads === false) return;

  // Deduplication for view events
  if (eventType === "album_viewed") {
    const dedupeHours = typeof advanced?.view_event_dedupe_hours === "number" ? advanced.view_event_dedupe_hours : 24;
    const windowStart = new Date(Date.now() - dedupeHours * 60 * 60 * 1000).toISOString();
    
    // Server-role query to bypass RLS for checking
    const { data: recentView } = await supabase
      .from("user_album_activity")
      .select("id")
      .eq("user_id", session.userId)
      .eq("album_id", albumId)
      .eq("event_type", "album_viewed")
      .gte("created_at", windowStart)
      .maybeSingle();

    if (recentView) return; // Already viewed recently
  }

  // Insert using the service role or normal client if RLS is bypassed.
  // Actually, we should use a service role client to insert since RLS denies inserts.
  // Wait, `supabase` in `@/lib/supabase` is the service role client by default in server context if SUPABASE_SERVICE_ROLE_KEY is set.
  // We'll just use it directly.
  const { error } = await supabase.from("user_album_activity").insert({
    user_id: session.userId,
    album_id: albumId,
    media_id: mediaId ?? null,
    event_type: eventType,
    album_status_at_event: albumStatus ?? null,
    source: source ?? null,
    metadata,
  });

  if (error) {
    console.error(
      JSON.stringify({
        event: "user_activity_log_failure",
        error: error,
        details: { albumId, eventType, session: session.userId },
      })
    );
  }
}
