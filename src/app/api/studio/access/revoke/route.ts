import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";
import { createAccessRevokedNotification, fetchAlbumsForNotifications } from "@/lib/notifications";

const revokeSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  scope: z.enum(["all_private", "selected_albums"]),
  albumIds: z.array(z.string().uuid()).optional(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const body = await request.json();
    const parsed = revokeSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("INVALID_INPUT", "Invalid payload.", 400, parsed.error.flatten());
    }

    const { userId, email, scope, albumIds, reason } = parsed.data;

    if (!userId && !email) {
      return apiError("INVALID_INPUT", "Must provide userId or email.", 400);
    }

    // Determine the query
    let baseQuery = supabase
      .from("album_access_grants")
      .update({
        status: "revoked",
        revoked_by: adminCheck.userId,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason || null,
      });

    if (userId && email) {
      baseQuery = baseQuery.or(`user_id.eq.${userId},email_normalized.eq.${email}`);
    } else if (userId) {
      baseQuery = baseQuery.eq("user_id", userId);
    } else if (email) {
      baseQuery = baseQuery.eq("email_normalized", email);
    }

    // Filter by scope
    if (scope === "all_private") {
      baseQuery = baseQuery.eq("scope", "all_private").eq("status", "active");
    } else if (scope === "selected_albums" && albumIds && albumIds.length > 0) {
      baseQuery = baseQuery.eq("scope", "selected_albums").in("album_id", albumIds).eq("status", "active");
    } else {
      // If selected_albums but no IDs provided, revoke all active selected albums?
      baseQuery = baseQuery.eq("scope", "selected_albums").eq("status", "active");
    }

    const { data: updatedRows, error } = await baseQuery.select("id, scope, album_id");

    if (error) {
      return apiError("SERVER_ERROR", error.message, 500);
    }

    // Also explicitly create a "revoked" row if they never had a grant, 
    // to strictly enforce denial in the future (optional, but good practice).
    // If no rows were updated (meaning they didn't have an active grant), we still want to block them.
    if (updatedRows && updatedRows.length === 0) {
       // Insert a pure revoked record
       if (scope === "all_private") {
         await supabase.from("album_access_grants").insert({
           user_id: userId || null,
           email_normalized: email || null,
           scope: "all_private",
           status: "revoked",
           granted_by: adminCheck.userId, // required field by schema
           granted_at: new Date().toISOString(),
           revoked_by: adminCheck.userId,
           revoked_at: new Date().toISOString(),
           revoke_reason: reason || null,
         });
       } else if (scope === "selected_albums" && albumIds) {
         const inserts = albumIds.map(id => ({
           user_id: userId || null,
           email_normalized: email || null,
           scope: "selected_albums",
           album_id: id,
           status: "revoked",
           granted_by: adminCheck.userId,
           granted_at: new Date().toISOString(),
           revoked_by: adminCheck.userId,
           revoked_at: new Date().toISOString(),
           revoke_reason: reason || null,
         }));
         await supabase.from("album_access_grants").insert(inserts);
       }
    }

    await logAuditEvent({
      request,
      session: adminCheck,
      action: "album_access_revoked",
      targetType: "user",
      targetId: userId || email || "unknown",
      metadata: { scope, albumCount: albumIds?.length || 0, reason },
    });

    if (userId) {
      const rowAlbumIds = (updatedRows ?? [])
        .map((row) => row.album_id)
        .filter(Boolean) as string[];
      await createAccessRevokedNotification({
        recipientUserId: userId,
        scope,
        albums: await fetchAlbumsForNotifications(albumIds?.length ? albumIds : rowAlbumIds),
        request,
        actorSession: adminCheck,
      });
    }

    return apiSuccess({ message: "Access revoked." });
  } catch (error) {
    return toServerError(error);
  }
}
