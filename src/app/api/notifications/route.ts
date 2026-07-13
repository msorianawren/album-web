import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPublicSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getPublicSession();
    if (!session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_user_id", session.userId)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ success: true, notifications: notifications || [] });
  } catch (err: unknown) {
    console.error("Notifications GET Error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
