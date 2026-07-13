import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";
import nodemailer from "nodemailer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const { replyText } = await request.json();

    if (!replyText || typeof replyText !== "string" || replyText.trim() === "") {
      return apiError("INVALID_INPUT", "Reply text cannot be empty.", 400);
    }

    // 1. Fetch the original message
    const { data: message, error: fetchError } = await supabase
      .from("contact_messages")
      .select("id, name, reply_email, subject, message_body")
      .eq("id", resolvedParams.id)
      .single();

    if (fetchError || !message) {
      return apiError("NOT_FOUND", "Message not found.", 404);
    }

    if (!message.reply_email) {
      return apiError("BAD_REQUEST", "No email address to reply to.", 400);
    }

    // 2. Setup Nodemailer Transport
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      return apiError("SERVER_ERROR", "Email server is not configured in .env.local", 500);
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // 3. Send the email
    // CRITICAL REQUIREMENT: Hardcode "Oriana Wren" as sender name.
    const senderName = "Oriana Wren";
    const mailOptions = {
      from: `"${senderName}" <${smtpUser}>`,
      to: message.reply_email,
      subject: `Re: ${message.subject}`,
      text: `${replyText}\n\n---\nOn ${new Date().toLocaleDateString()}, ${message.name} wrote:\n> ${message.message_body.replace(/\n/g, "\n> ")}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <p style="white-space: pre-wrap;">${replyText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 32px 0;" />
          <blockquote style="border-left: 4px solid #eaeaea; padding-left: 16px; margin-left: 0; color: #666;">
            <p><strong>On ${new Date().toLocaleDateString()}, ${message.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")} wrote:</strong></p>
            <p style="white-space: pre-wrap;">${message.message_body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </blockquote>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // 4. Update the database to mark as replied
    const { error: updateError } = await supabase
      .from("contact_messages")
      .update({
        reply_text: replyText,
        replied_at: new Date().toISOString(),
        replied_by: adminCheck.userId,
        status: "read", // Also mark as read
      })
      .eq("id", resolvedParams.id);

    if (updateError) {
      console.error("Failed to update message reply status in DB", updateError);
      // Even if DB update fails, the email was sent, so we still return success with a warning
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    console.error("Reply API Error:", error);
    // Be careful not to leak SMTP errors entirely to frontend
    return apiError("SERVER_ERROR", "Failed to send email. Check SMTP credentials.", 500);
  }
}
