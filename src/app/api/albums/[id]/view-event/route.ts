import { NextRequest, NextResponse } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { getAlbum } from "@/lib/albums";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { createPublicServerClient } from "@/lib/db/public";
import { recordUserAlbumActivity, recordGuestAlbumActivity } from "@/lib/user-activity";
import { logAuditEvent } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { apiError, toServerError } from "@/lib/errors";
import { getSiteSettings } from "@/lib/site-settings";
import { getOrCreateGuestVisitor, isGuestTrackingEnabled, setGuestCookie } from "@/lib/guest-visitor";

export const runtime = "nodejs";

interface ViewEventParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: ViewEventParams) {
  try {
    const { id } = await params;
    const session = await getPublicSession(request);

    const rate = await enforceRateLimit({
      request,
      session,
      policy: { action: "view_event", limit: 100, windowSeconds: 300 },
    });
    if (!rate.allowed) return apiError("RATE_LIMITED", "Too many requests", 429);

    let source = "album_page";
    try {
      const body = await request.json();
      if (body.source) source = String(body.source).substring(0, 50);
    } catch { /* ignore */ }

    // — Authenticated user path —
    if (session.userId) {
      const userClient = await createAuthenticatedUserClient(request);
      const album = await getAlbum(id, { isAdmin: session.isAdmin, userClient });
      if (!album) return apiError("NOT_FOUND", "Album not found", 404);

      await Promise.all([
        recordUserAlbumActivity({
          request, session, albumId: id,
          eventType: "album_viewed", albumStatus: album.status, source,
        }),
        logAuditEvent({
          request, session, action: "view_album",
          targetType: "album", targetId: id,
          metadata: { album_name: album.title, source },
        }),
      ]);

      return NextResponse.json({ success: true });
    }

    // — Guest path —
    const settings = await getSiteSettings();
    const advanced = settings.advanced_settings as Record<string, unknown> | undefined;
    if (!isGuestTrackingEnabled(advanced)) {
      return NextResponse.json({ success: true, message: "Guest tracking disabled" });
    }

    const publicClient = createPublicServerClient();
    const album = await getAlbum(id, { isAdmin: false, userClient: publicClient });
    if (!album) return apiError("NOT_FOUND", "Album not found", 404);

    const guest = await getOrCreateGuestVisitor(request);
    if (!guest) return NextResponse.json({ success: true });

    const response = NextResponse.json({ success: true });

    // Set gid cookie only if not already present (avoid resetting TTL needlessly)
    if (!request.cookies.get("gid")) {
      setGuestCookie(response.cookies, guest.id);
    }

    // Fire-and-forget: record activity without blocking the response
    void Promise.all([
      recordGuestAlbumActivity({
        guestVisitorId: guest.id, albumId: id,
        eventType: "album_viewed", albumStatus: album.status, source,
        advancedSettings: advanced,
      }),
      logAuditEvent({
        request, session, action: "view_album",
        targetType: "album", targetId: id,
        guestVisitorId: guest.id,
        metadata: { album_name: album.title, source, guest_name: guest.visitor_name },
      }),
    ]);

    return response;
  } catch (error) {
    return toServerError(error);
  }
}
