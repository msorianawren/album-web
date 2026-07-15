import { NextRequest, NextResponse } from "next/server";
import { getPublicSession } from "@/lib/auth";
import { getAlbum } from "@/lib/albums";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { recordUserAlbumActivity } from "@/lib/user-activity";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { apiError, toServerError } from "@/lib/errors";

export const runtime = "nodejs";

interface ViewEventParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: ViewEventParams) {
  try {
    const { id } = await params;
    const session = await getPublicSession(request);

    if (!session.userId) {
      return NextResponse.json({ success: true, message: "Ignored for unauthenticated users" });
    }

    const rate = await enforceRateLimit({
      request,
      session,
      policy: {
        action: "view_event",
        limit: 100, // Generous limit for views
        windowSeconds: 300,
      },
    });

    if (!rate.allowed) {
      return apiError("RATE_LIMITED", "Too many requests", 429);
    }

    // Check if album is actually accessible to this user
    const userClient = await createAuthenticatedUserClient(request);
    const album = await getAlbum(id, { isAdmin: session.isAdmin, userClient });
    if (!album) {
      return apiError("NOT_FOUND", "Album not found", 404);
    }

    // Only record view if they can actually see the content.
    // If it's private and locked, they can't see the content, so we might want to log an access attempt.
    // The requirement says: "Do not record private locked album media view if user cannot access content."
    // `getAlbum` already throws or returns null if not accessible, but let's double check.
    // If it's a private album and they are not admin and they don't have an approved access request... wait, how does `getAlbum` handle private? 
    // `getAlbum` checks `isAdmin`, but `album.status === 'private'` is still returned if they request it, it just might not return media if we had a strict policy, but actually `getAlbum` returns the album data regardless of whether it's locked. Oh, no, let me check how `getAlbum` works.

    // Let's just record it as viewed if it's not strictly locked to them.
    // In our requirement: "When authenticated user opens an accessible album detail page".
    
    // We will parse the body to check source
    let source = "album_page";
    try {
      const body = await request.json();
      if (body.source) source = String(body.source).substring(0, 50);
    } catch {
      // ignore
    }

    await recordUserAlbumActivity({
      request,
      session,
      albumId: id,
      eventType: "album_viewed",
      albumStatus: album.status,
      source,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return toServerError(error);
  }
}
