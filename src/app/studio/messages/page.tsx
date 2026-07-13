import { createClient } from "@supabase/supabase-js";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { MessageList } from "./MessageList";

// Note: Use service role to bypass RLS since this is a protected studio route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export default async function MessagesPage() {
  const { data: messages, error } = await supabase
    .from("contact_messages")
    .select("id, name, reply_email, subject, inquiry_type, message_preview, message_body, status, risk_level, created_at, reply_text, replied_at")
    .neq("status", "deleted") // Don't fetch deleted here to save load
    .order("created_at", { ascending: false });

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
          <MessageList initialMessages={messages || []} />
        )}
      </div>
    </div>
  );
}