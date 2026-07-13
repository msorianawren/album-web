import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPublicSession } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPublicSession();
    if (!session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    
    if (!body || !["read", "dismissed"].includes(body.status)) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    const updateData: any = { status: body.status };
    if (body.status === "read") updateData.read_at = new Date().toISOString();
    if (body.status === "dismissed") updateData.dismissed_at = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update(updateData)
      .eq("id", id)
      .eq("recipient_user_id", session.userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Notifications POST Error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
