import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPublicSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

type NotificationUpdate = {
  status: "read" | "dismissed";
  read_at?: string;
  dismissed_at?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPublicSession(request);
    if (!session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    
    if (!body || !["read", "dismissed"].includes(body.status)) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400, headers: noStoreHeaders });
    }

    const updateData: NotificationUpdate = { status: body.status };
    if (body.status === "read") updateData.read_at = new Date().toISOString();
    if (body.status === "dismissed") updateData.dismissed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("notifications")
      .update(updateData)
      .eq("id", id)
      .eq("recipient_user_id", session.userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ success: false, message: "Notification not found" }, { status: 404, headers: noStoreHeaders });
    }

    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (err: unknown) {
    console.error("Notifications POST Error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500, headers: noStoreHeaders });
  }
}
