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

    // 2. Update the database to mark as replied
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
      return apiError("SERVER_ERROR", "Failed to save reply.", 500);
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    console.error("Reply API Error:", error);
    return toServerError(error);
  }
}
