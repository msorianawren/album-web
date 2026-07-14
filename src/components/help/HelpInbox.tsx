"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { HelpThreadConversation } from "@/components/help/HelpThreadConversation";

type Thread = { id: string; subject: string | null; status: string; last_message_at: string };

export function HelpInbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/help/threads", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (mounted) setThreads(payload?.threads || []); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (activeId) return <div className="mt-16 min-h-[560px] overflow-hidden rounded-[1.5rem] border border-border bg-surface"><HelpThreadConversation threadId={activeId} onBack={() => setActiveId(null)} /></div>;
  if (!loading && threads.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-semibold text-text-primary">My conversations</h2>
      <div className="mt-5 grid gap-3">
        {loading ? <p className="text-sm text-text-secondary">Loading conversations...</p> : threads.map((thread) => (
          <button key={thread.id} type="button" onClick={() => setActiveId(thread.id)} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-accent">
            <span className="min-w-0"><span className="block truncate font-medium text-text-primary">{thread.subject || "Conversation with Oriana Wren"}</span><span className="mt-1 block text-xs text-text-secondary">{thread.status.replace("_", " ")}</span></span>
            <MessageSquarePlus className="h-5 w-5 shrink-0 text-muted-accent" />
          </button>
        ))}
      </div>
    </section>
  );
}
