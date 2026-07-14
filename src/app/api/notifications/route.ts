import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPublicSession } from "@/lib/auth";

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

    const { searchParams } = new URL(request.url);
    if (searchParams.get("mode") === "count") {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", session.userId)
        .eq("status", "unread");

      if (error) throw error;
      return NextResponse.json({ success: true, count: count ?? 0 }, { headers: noStoreHeaders });
    }

    const { data: notifications, error } = await supabase
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
  } catch (err: unknown) {
    console.error("Notifications GET Error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500, headers: noStoreHeaders });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getPublicSession(request);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ status: "read", read_at: now })
      .eq("recipient_user_id", session.userId)
      .eq("status", "unread");

    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (err: unknown) {
    console.error("Notifications PATCH Error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500, headers: noStoreHeaders });
  }
}
