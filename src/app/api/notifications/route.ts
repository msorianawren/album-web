import { NextRequest, NextResponse } from "next/server";
import { classifyDataFailure } from "@/lib/app-failure";
import { getPublicSession } from "@/lib/auth";
import { createAuthenticatedUserClient } from "@/lib/db/user";
import { toServerError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function normalizeType(type: string) {
  if (type === "access_granted") return "album_access_granted";
  if (type === "access_revoked") return "album_access_revoked";
  return type;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getPublicSession(request);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }
    const client = await createAuthenticatedUserClient(request);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get("mode") === "count") {
      const { count, error } = await client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", session.userId)
        .eq("status", "unread");

      if (error) throw error;
      return NextResponse.json({ success: true, count: count ?? 0 }, { headers: noStoreHeaders });
    }

    const { data: notifications, error } = await client
      .from("notifications")
      .select("id, type, title, body, target_url, status, created_at, read_at")
      .eq("recipient_user_id", session.userId)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      notifications: (notifications || []).map((notification) => ({
        ...notification,
        type: normalizeType(notification.type),
      })),
    }, { headers: noStoreHeaders });
  } catch (error: unknown) {
    return toServerError(
      classifyDataFailure(error, "notifications.user_list"),
      request,
      "api.notifications.list",
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getPublicSession(request);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }
    const client = await createAuthenticatedUserClient(request);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }

    const now = new Date().toISOString();
    const { error } = await client
      .from("notifications")
      .update({ status: "read", read_at: now })
      .eq("recipient_user_id", session.userId)
      .eq("status", "unread");

    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error: unknown) {
    return toServerError(
      classifyDataFailure(error, "notifications.user_mark_all_read"),
      request,
      "api.notifications.mark_all_read",
    );
  }
}
