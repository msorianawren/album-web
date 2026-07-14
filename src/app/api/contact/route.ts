import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getSiteSettings } from "@/lib/site-settings";
import { enforceRateLimit } from "@/lib/security-rate-limit";
import { hashIpAddress } from "@/lib/request-info";
import { getPublicSession } from "@/lib/auth";
import { createAdminNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const settings = await getSiteSettings();

    if (settings.contact_form_mode === "disabled" || settings.contact_form_mode === "mailto_only") {
      return NextResponse.json({ success: false, message: "Server-side contact submissions are disabled." }, { status: 403 });
    }

    // Check request size
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 50000) {
      return NextResponse.json({ success: false, message: "Payload too large." }, { status: 413 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid JSON payload." }, { status: 400 });
    }

    // Honeypot check
    if (settings.enable_honeypot && body.honey_trap) {
      // Pretend success to fool bots
      return NextResponse.json({ success: true });
    }

    // Time-to-submit check
    if (settings.min_submit_time_seconds > 0) {
      const submitTimeStr = body.submit_start_time;
      if (!submitTimeStr) return NextResponse.json({ success: false, message: "Validation failed." }, { status: 400 });
      
      const submitTime = parseInt(submitTimeStr, 10);
      if (isNaN(submitTime) || (Date.now() - submitTime) < (settings.min_submit_time_seconds * 1000)) {
        return NextResponse.json({ success: false, message: "Submitted too quickly. Please try again." }, { status: 429 });
      }
    }

    const schema = z.object({
      name: z.string().min(1).max(settings.contact_max_name_length).transform(s => s.replace(/[\r\n]+/g, ' ').trim()),
      email: z.string().email().max(100).transform(s => s.replace(/[\r\n]+/g, '').trim()),
      subject: z.string().min(1).max(settings.contact_max_subject_length).transform(s => s.replace(/[\r\n]+/g, ' ').trim()),
      inquiry_type: z.string(),
      message: z.string().min(5).max(settings.contact_max_message_length),
    });

    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ success: false, message: "Invalid input fields." }, { status: 400 });
    }

    const { name, email, subject, inquiry_type, message } = result.data;

    if (settings.contact_allowed_inquiry_types.length > 0 && !settings.contact_allowed_inquiry_types.includes(inquiry_type)) {
      return NextResponse.json({ success: false, message: "Invalid inquiry type." }, { status: 400 });
    }

    // Rate Limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown-ip";
    const ipHash = hashIpAddress(ip);
    const userAgent = request.headers.get("user-agent") || "";
    const userAgentHash = hashIpAddress(userAgent); // Resusing hash fn

    const rateLimit = await enforceRateLimit({
      request,
      session: { userId: null, email: null, displayName: null, avatarUrl: null, role: "guest", isAdmin: false, isFounder: false, isBlocked: false, blockedReason: null },
      policy: {
        action: "contact_submit",
        limit: settings.contact_rate_limit_count,
        windowSeconds: settings.contact_rate_limit_window_seconds
      }
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ success: false, message: "Too many requests. Please try again later." }, { status: 429 });
    }

    // Duplicate detection
    if (settings.contact_duplicate_window_seconds > 0) {
      const cutoff = new Date(Date.now() - settings.contact_duplicate_window_seconds * 1000).toISOString();
      const { count } = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .eq("reply_email", email)
        .eq("message_body", message)
        .gte("created_at", cutoff);
        
      if (count && count > 0) {
        return NextResponse.json({ success: false, message: "Duplicate message detected." }, { status: 429 });
      }
    }

    // Safe to insert
    const message_preview = message.substring(0, 200);

    const session = await getPublicSession();

    const { data: createdMessage, error } = await supabase.from("contact_messages").insert({
      user_id: session.userId || null,
      name,
      reply_email: email,
      inquiry_type,
      subject,
      message_preview,
      message_body: message,
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
      status: "new",
      risk_level: "low",
    }).select("id").single();

    if (error) {
      console.error("Contact Form Insert Error:", error);
      return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
    }

    await createAdminNotification({
      type: "admin_new_message",
      title: "New contact message",
      body: `New contact message from ${name}.`,
      targetUrl: "/studio/messages",
      metadata: { message_id: createdMessage.id },
      request,
      actorSession: session.userId ? session : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Contact API Unhandled Error:", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}
