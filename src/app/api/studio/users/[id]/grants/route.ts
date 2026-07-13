import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import { z } from "zod";

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

    await revokeQuery;

    // 2. Insert new grants
    if (scope === "all_private") {
      const { error } = await supabase.from("album_access_grants").insert({
        user_id: targetUserId,
        email_normalized: targetEmail,
        scope: "all_private",
        granted_by: session.userId,
        status: "active",
      });
      if (error) throw error;
    } else if (scope === "selected_albums" && albumIds && albumIds.length > 0) {
      const grants = albumIds.map((albumId) => ({
        user_id: targetUserId,
        email_normalized: targetEmail,
        scope: "selected_albums",
        album_id: albumId,
        granted_by: session.userId,
        status: "active",
      }));
      const { error } = await supabase.from("album_access_grants").insert(grants);
      if (error) throw error;
    }
    if (targetUserId) {
      if (scope === "selected_albums" && (!albumIds || albumIds.length === 0)) {
        await supabase.from("notifications").insert({
          recipient_user_id: targetUserId,
          type: "access_revoked",
          title: "Album Access Revoked",
          body: "Your access to private albums has been revoked.",
          target_url: "/albums",
        });
      } else {
        await supabase.from("notifications").insert({
          recipient_user_id: targetUserId,
          type: "access_granted",
          title: "Album Access Granted",
          body: scope === "all_private" 
            ? "You have been granted access to all private albums." 
            : `You have been granted access to ${albumIds?.length} private album(s).`,
          target_url: "/albums",
        });
      }
    }

    // 3. Log audit event
    const { logAuditEvent } = await import("@/lib/audit");
    await logAuditEvent({
      request,
      session: session as any,
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
