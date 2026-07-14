"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ChevronLeft, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Message = { id: string; sender_type: "user" | "assistant" | "admin" | "system"; public_sender_name: string; body: string; created_at: string };
type Thread = { id: string; subject: string | null; status: "open" | "waiting_admin" | "waiting_user" | "closed" | "archived" | "blocked"; last_message_at: string };

const statusCopy: Record<Thread["status"], string> = {
  open: "Open",
  waiting_admin: "Waiting for Oriana Wren",
  waiting_user: "Oriana Wren replied",
  closed: "Closed",
  archived: "Archived",
  blocked: "Unavailable",
};

export function HelpThreadConversation({ threadId, onBack }: { threadId: string; onBack?: () => void }) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/help/threads/${threadId}/messages`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not load the conversation.");
      setThread(payload.thread);
      setMessages(payload.messages || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the conversation.");
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || !thread || ["closed", "archived", "blocked"].includes(thread.status)) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/help/threads/${threadId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not send your message.");
      setMessages((current) => [...current, payload.message]);
      setThread((current) => current ? { ...current, status: "waiting_admin", last_message_at: new Date().toISOString() } : current);
      setBody("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Conversation with Oriana Wren">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-background/55 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {onBack ? <button type="button" onClick={onBack} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text-primary" aria-label="Back to assistant"><ChevronLeft className="h-4 w-4" /></button> : null}
            <p className="truncate text-sm font-semibold text-text-primary">Oriana Wren</p>
          </div>
          <p className="mt-1 text-xs text-text-secondary">{thread ? statusCopy[thread.status] : "Conversation"}</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-primary" aria-label="Check for replies"><RefreshCw className="h-4 w-4" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? <p className="text-sm text-text-secondary">Loading conversation...</p> : null}
        {error ? <p className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600">{error}</p> : null}
        {!loading && messages.map((message) => (
          <article key={message.id} className={message.sender_type === "user" ? "ml-8 rounded-2xl rounded-br-md bg-accent px-4 py-3 text-sm text-accent-foreground" : "mr-8 rounded-2xl rounded-bl-md border border-border bg-background/65 px-4 py-3 text-sm text-text-primary"}>
            <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] opacity-70">{message.sender_type === "user" ? "You" : message.public_sender_name}</p>
            <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
          </article>
        ))}
      </div>
      <form onSubmit={submit} className="border-t border-border bg-surface p-4">
        <label className="sr-only" htmlFor={`help-message-${threadId}`}>Reply to Oriana Wren</label>
        <textarea id={`help-message-${threadId}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={3} disabled={!thread || ["closed", "archived", "blocked"].includes(thread.status) || sending} placeholder="Write a reply..." className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
        <div className="mt-2 flex justify-end"><Button type="submit" disabled={!body.trim() || sending || !thread || ["closed", "archived", "blocked"].includes(thread.status)}><Send className="mr-2 h-4 w-4" />{sending ? "Sending..." : "Send reply"}</Button></div>
      </form>
    </section>
  );
}
