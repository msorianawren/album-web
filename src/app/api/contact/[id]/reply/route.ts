import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getPublicSession } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { enforceRateLimit } from "@/lib/security-rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPublicSession();
    if (!session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id: messageId } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid payload." }, { status: 400 });
    }

    const schema = z.object({
      message: z.string().min(1).max(2000),
    });

    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ success: false, message: "Invalid input fields." }, { status: 400 });
    }

    const { message } = result.data;

    // Rate Limiting for replies
    const settings = await getSiteSettings();
    const rateLimit = await enforceRateLimit({
      request,
      session,
      policy: {
        action: "contact_reply",
        limit: 10,
        windowSeconds: 60,
      }
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ success: false, message: "Too many requests. Please try again later." }, { status: 429 });
    }

    // Verify ownership
    const { data: thread } = await supabase
      .from("contact_messages")
      .select("id")
      .eq("id", messageId)
      .eq("user_id", session.userId)
      .single();

    if (!thread) {
      return NextResponse.json({ success: false, message: "Thread not found or unauthorized." }, { status: 404 });
    }

    // Anti-Spam: Max 10 consecutive user messages
    const { data: replies } = await supabase
      .from("contact_message_replies")
      .select("author_type, created_at")
      .eq("message_id", messageId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (replies && replies.length === 10) {
      const allUser = replies.every(r => r.author_type === "user");
      if (allUser) {
        return NextResponse.json({ 
          success: false, 
          message: "Please wait for Oriana Wren to reply before sending more messages." 
        }, { status: 429 });
      }
    }

    // Update status to 'new' so admin knows there's a new reply
    await supabase.from("contact_messages").update({ status: "new", updated_at: new Date().toISOString() }).eq("id", messageId);

    // Insert user reply
    const { error } = await supabase.from("contact_message_replies").insert({
      message_id: messageId,
      author_type: "user",
      author_user_id: session.userId,
      body: message,
      public_display_name: session.displayName || "User",
    });

    if (error) {
      console.error("Reply insert error", error);
      return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
    }

    // Admin notification
    await supabase.from("notifications").insert({
      recipient_user_id: process.env.DEFAULT_OWNER_ID, // Use the real admin id from env or query
      type: "admin_new_message",
      title: "New user reply",
      body: `New reply from ${session.displayName || "a user"}.`,
      target_url: `/studio/messages/${messageId}`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("User Reply API Error:", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}
