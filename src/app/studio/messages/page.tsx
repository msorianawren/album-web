import { createClient } from "@supabase/supabase-js";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { MessageList } from "./MessageList";

// Note: Use service role to bypass RLS since this is a protected studio route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

interface ContactMessageRow {
  id: string;
  name: string | null;
  reply_email: string | null;
  subject: string | null;
  inquiry_type: string | null;
  message_preview: string | null;
  message_body: string;
  status: string;
  risk_level: string | null;
  created_at: string;
}

interface ContactMessageReplyRow {
  id: string;
  message_id: string;
  author_type: "user" | "admin";
  body: string;
  public_display_name: string;
  created_at: string;
  is_internal_note?: boolean;
}

type ContactMessageWithReplies = ContactMessageRow & {
  replies: ContactMessageReplyRow[];
};

interface MessageListItem {
  id: string;
  name: string;
  reply_email: string;
  subject: string;
  inquiry_type: string;
  message_preview: string;
  message_body: string;
  status: string;
  risk_level: string;
  created_at: string;
  replies: ContactMessageReplyRow[];
}

export default async function MessagesPage() {
  const { data: messages, error } = await supabase
    .from("contact_messages")
    .select("id, name, reply_email, subject, inquiry_type, message_preview, message_body, status, risk_level, created_at")
    .neq("status", "deleted") // Don't fetch deleted here to save load
    .order("created_at", { ascending: false });

  let fullMessages: ContactMessageWithReplies[] = ((messages ?? []) as ContactMessageRow[]).map((message) => ({
    ...message,
    replies: [],
  }));
  if (fullMessages.length > 0) {
    const messageIds = fullMessages.map((m) => m.id);
    const { data: replies } = await supabase
      .from("contact_message_replies")
      .select("*")
      .in("message_id", messageIds)
      .order("created_at", { ascending: true });

    fullMessages = fullMessages.map((m) => ({
      ...m,
      replies: ((replies ?? []) as ContactMessageReplyRow[]).filter((r) => r.message_id === m.id)
    }));
  }

  return (
    <div className="grid gap-5">
      <StudioPageHeader
        eyebrow="Inbox"
        title="Messages"
        description="View inquiries submitted through your public contact form."
      />

      <div className="grid gap-4">
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-500">
            Failed to load messages. Make sure the database migration has been applied.
          </div>
        ) : (
          <MessageList
            initialMessages={fullMessages.map((message): MessageListItem => ({
              id: message.id,
              name: message.name ?? "Anonymous",
              reply_email: message.reply_email ?? "",
              subject: message.subject ?? "No subject",
              inquiry_type: message.inquiry_type ?? "General Inquiry",
              message_preview: message.message_preview ?? "",
              message_body: message.message_body,
              status: message.status,
              risk_level: message.risk_level ?? "normal",
              created_at: message.created_at,
              replies: message.replies,
            }))}
          />
        )}
      </div>
    </div>
  );
}
