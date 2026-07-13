import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError, apiSuccess, toServerError } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const adminCheck = await requireAdmin(request);
  if (!adminCheck) return apiError("FORBIDDEN", "Requires admin privileges.", 403);

  try {
    const { replyText, isInternal } = await request.json();

    if (!replyText || typeof replyText !== "string" || replyText.trim() === "") {
      return apiError("INVALID_INPUT", "Reply text cannot be empty.", 400);
    }

    // 1. Fetch the original message
    const { data: message, error: fetchError } = await supabase
      .from("contact_messages")
      .select("id, user_id, name, reply_email, subject, message_body")
      .eq("id", resolvedParams.id)
      .single();

    if (fetchError || !message) {
      return apiError("NOT_FOUND", "Message not found.", 404);
    }

    // 2. Insert into contact_message_replies
    const { error: insertError } = await supabase
      .from("contact_message_replies")
      .insert({
        message_id: message.id,
        author_type: "admin",
        author_user_id: adminCheck.userId,
        body: replyText,
        public_display_name: "Oriana Wren",
        is_internal_note: !!isInternal,
      });

    if (insertError) {
      console.error("Failed to insert reply", insertError);
      return apiError("SERVER_ERROR", "Failed to save reply.", 500);
    }

    // 3. Update the thread status
    await supabase
      .from("contact_messages")
      .update({
        status: "read", // Or "replied"
        updated_at: new Date().toISOString(),
      })
      .eq("id", message.id);

    // 4. Send notification if the user is registered and it's not an internal note
    if (!isInternal && message.user_id) {
      await supabase.from("notifications").insert({
        recipient_user_id: message.user_id,
        type: "message_reply",
        title: "Reply from Oriana Wren",
        body: `You have a new reply in Contact.`,
        target_url: `/contact`, // Or specific message URL if you have one
      });
    }

    // Note: We don't send emails here anymore as per the prompt instructions.
    
    return apiSuccess({ success: true });
  } catch (error: any) {
    console.error("Reply API Error:", error);
    return toServerError(error);
  }
}
