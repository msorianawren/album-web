import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { z } from "zod";
import {
  createAccessGrantedNotification,
  createAccessRevokedNotification,
  fetchAlbumsForNotifications,
} from "@/lib/notifications";
import { writeAccessHistory } from "@/lib/access-request-workflow";

const grantSchema = z.object({
  scope: z.enum(["all_private", "selected_albums"]),
  albumIds: z.array(z.string()).optional(),
  email: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return apiError("UNAUTHENTICATED", "Unauthorized", 401);

  try {
    const p = await params;
    const userId = p.id;
    const body = await request.json();
    const parsed = grantSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid payload.", 400, parsed.error.flatten());
    }

    const { scope, albumIds, email } = parsed.data;

    const isIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
    const targetUserId = isIdUuid ? userId : null;
    const targetEmail = email || (!isIdUuid ? userId : null);

    // 1. Revoke existing active grants for this user/email
    let revokeQuery = supabase
      .from("album_access_grants")
      .update({
        status: "revoked",
        revoked_by: session.userId,
        revoked_at: new Date().toISOString(),
        revoke_reason: "Superseded by new grant",
      })
      .eq("status", "active");

    if (targetUserId) {
      revokeQuery = revokeQuery.eq("user_id", targetUserId);
    } else if (targetEmail) {
      revokeQuery = revokeQuery.eq("email_normalized", targetEmail);
    }

    const { data: revokedRows } = await revokeQuery.select("id, scope, album_id");
    for (const row of revokedRows ?? []) {
      await writeAccessHistory({
        actorUserId: session.userId,
        targetUserId,
        targetEmail,
        action: "grant_revoked",
        scope: row.scope,
        grantId: row.id,
        albumIds: row.album_id ? [row.album_id] : undefined,
        reason: "Superseded by new grant",
      });
    }

    // 2. Insert new grants
    const isEmptySelectedGrant = scope === "selected_albums" && (!albumIds || albumIds.length === 0);
    if (scope === "all_private") {
      const { data: grant, error } = await supabase.from("album_access_grants").insert({
        user_id: targetUserId,
        email_normalized: targetEmail,
        scope: "all_private",
        granted_by: session.userId,
        status: "active",
      }).select("id").single();
      if (error) throw error;
      await writeAccessHistory({
        actorUserId: session.userId,
        targetUserId,
        targetEmail,
        action: "grant_created",
        scope: "all_private",
        grantId: grant?.id ?? null,
      });
    } else if (scope === "selected_albums" && albumIds && albumIds.length > 0) {
      const grants = albumIds.map((albumId) => ({
        user_id: targetUserId,
        email_normalized: targetEmail,
        scope: "selected_albums",
        album_id: albumId,
        granted_by: session.userId,
        status: "active",
      }));
      const { data: createdGrants, error } = await supabase.from("album_access_grants").insert(grants).select("id, album_id");
      if (error) throw error;
      for (const grant of createdGrants ?? []) {
        await writeAccessHistory({
          actorUserId: session.userId,
          targetUserId,
          targetEmail,
          action: "grant_created",
          scope: "selected_albums",
          grantId: grant.id,
          albumIds: grant.album_id ? [grant.album_id] : undefined,
        });
      }
    }
    if (targetUserId) {
      if (isEmptySelectedGrant) {
        const revokedAlbumIds = (revokedRows ?? [])
          .map((row) => row.album_id)
          .filter(Boolean) as string[];
        const revokedHadGlobal = (revokedRows ?? []).some((row) => row.scope === "all_private");
        await createAccessRevokedNotification({
          recipientUserId: targetUserId,
          scope: revokedHadGlobal ? "all_private" : "selected_albums",
          albums: await fetchAlbumsForNotifications(revokedAlbumIds),
          request,
          actorSession: session,
        });
      } else {
        await createAccessGrantedNotification({
          recipientUserId: targetUserId,
          scope,
          albums: await fetchAlbumsForNotifications(albumIds),
          request,
          actorSession: session,
        });
      }
    }

    // 3. Log audit event
    const { logAuditEvent } = await import("@/lib/audit");
    await logAuditEvent({
      request,
      session,
      action: "album_access_granted",
      targetType: "user",
      targetId: targetUserId || targetEmail || "unknown",
      metadata: { scope, albumCount: albumIds?.length || 0 },
    });

    return apiSuccess({ message: "Grants updated successfully" });
  } catch (error) {
    return toServerError(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return apiError("UNAUTHENTICATED", "Unauthorized", 401);

  try {
    const p = await params;
    const userId = p.id;

    const { data, error } = await supabase
      .from("album_access_grants")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) throw error;

    return apiSuccess({ grants: data });
  } catch (error) {
    return toServerError(error);
  }
}
