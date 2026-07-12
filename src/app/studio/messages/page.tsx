import { Mail, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";

// Note: Use service role to bypass RLS since this is a protected studio route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export default async function MessagesPage() {
  const { data: messages, error } = await supabase
    .from("contact_messages")
    .select("*")
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
        ) : !messages || messages.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-text-secondary">
            Your inbox is empty. No messages yet.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="flex flex-col gap-4 rounded-[1.4rem] border border-border bg-surface/82 p-5 shadow-sm"
            >
              <div>
                <div className="mb-2 flex items-center gap-2">
                  {msg.status === "new" ? (
                    <span className="flex items-center gap-1 rounded bg-accent/10 px-2 py-1 text-xs font-semibold text-accent-foreground uppercase">
                      <Clock className="h-3 w-3" /> New
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded bg-background px-2 py-1 text-xs font-semibold text-text-secondary uppercase">
                      <CheckCircle2 className="h-3 w-3" /> Read
                    </span>
                  )}
                  <span className="text-xs font-medium text-text-secondary">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-text-primary">{msg.subject}</h3>
                
                <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">{msg.name}</span>
                  <span>&bull;</span>
                  <a href={`mailto:${msg.email}`} className="text-accent hover:underline">
                    {msg.email}
                  </a>
                </div>
                
                <div className="mt-4 rounded-xl border border-border bg-background/50 p-4 text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}