"use client";

import { useState } from "react";
import { Archive, CheckCircle2, MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Thread = { id: string; owner_email: string | null; owner_name: string | null; source: string; status: string; subject: string | null; last_message_at: string; created_at: string };
type Detail = { thread: Thread; messages: Array<{ id: string; sender_type: string; public_sender_name: string; body: string; created_at: string; is_internal_note: boolean }>; };

export function HelpMessageList({ initialThreads, page, total, pageSize, status, source, query }: { initialThreads: Thread[]; page: number; total: number; pageSize: number; status?: string; source?: string; query?: string }) {
  const [selected, setSelected] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  async function openThread(id: string) {
    setLoading(true); setError("");
    try { const response = await fetch(`/api/studio/help/threads/${id}`, { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || "Could not load the conversation."); setSelected(payload.data); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load the conversation."); }
    finally { setLoading(false); }
  }

  async function submit(action: "reply" | "note" | "status", statusValue?: string) {
    if (!selected || (action !== "status" && !reply.trim())) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/studio/help/threads/${selected.thread.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "status" ? { action, status: statusValue } : { action, body: reply }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not update the conversation.");
      setReply(""); await openThread(selected.thread.id);
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Could not update the conversation."); }
    finally { setLoading(false); }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const params = new URLSearchParams();
  if (status) params.set("status", status); if (source) params.set("source", source); if (query) params.set("q", query);
  const link = (next: number) => { const copy = new URLSearchParams(params); copy.set("page", String(next)); return `/studio/messages?${copy.toString()}`; };

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
    <section className="rounded-2xl border border-border bg-surface p-3">
      <form className="mb-3 grid gap-2 sm:grid-cols-3" action="/studio/messages">
        <input name="q" defaultValue={query} placeholder="Search user, email, subject" className="min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary" />
        <select name="status" defaultValue={status || ""} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary"><option value="">All statuses</option><option value="waiting_admin">Waiting admin</option><option value="waiting_user">Waiting user</option><option value="open">Open</option><option value="closed">Closed</option><option value="archived">Archived</option><option value="blocked">Blocked</option></select>
        <select name="source" defaultValue={source || ""} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary"><option value="">All sources</option><option value="assistant">Assistant</option><option value="contact">Contact</option><option value="private_access">Private access</option><option value="system">System</option></select>
      </form>
      <div className="space-y-2">
        {initialThreads.length === 0 ? <p className="p-5 text-sm text-text-secondary">No unified help conversations yet. Existing legacy Contact messages remain available in the database.</p> : initialThreads.map((thread) => <button key={thread.id} type="button" onClick={() => void openThread(thread.id)} className="w-full rounded-xl border border-border bg-background/45 p-4 text-left transition hover:border-accent">
          <span className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block truncate font-medium text-text-primary">{thread.subject || "No subject"}</span><span className="mt-1 block truncate text-xs text-text-secondary">{thread.owner_name || "Visitor"} · {thread.owner_email || "No email"}</span></span><span className="rounded-full bg-surface px-2 py-1 text-[0.65rem] uppercase text-text-secondary">{thread.status.replace("_", " ")}</span></span>
          <span className="mt-3 block text-xs text-text-tertiary">{thread.source} · {new Date(thread.last_message_at).toLocaleString()}</span>
        </button>)}</div>
      <nav className="mt-4 flex items-center justify-between gap-3 text-sm"><a className="rounded-lg border border-border px-3 py-2 text-text-primary aria-disabled:opacity-50" aria-disabled={page <= 1} href={page > 1 ? link(page - 1) : undefined}>Previous</a><span className="text-text-secondary">{page} / {pages}</span><a className="rounded-lg border border-border px-3 py-2 text-text-primary aria-disabled:opacity-50" aria-disabled={page >= pages} href={page < pages ? link(page + 1) : undefined}>Next</a></nav>
    </section>
    <section className="min-h-[540px] rounded-2xl border border-border bg-surface p-5">
      {loading && !selected ? <p className="text-sm text-text-secondary">Loading conversation...</p> : null}
      {error ? <p className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600">{error}</p> : null}
      {!selected && !loading ? <div className="flex min-h-[480px] flex-col items-center justify-center text-center text-text-secondary"><MessageSquare className="mb-3 h-8 w-8" /><p>Select a conversation to read and reply.</p></div> : null}
      {selected ? <div className="flex h-full min-h-[500px] flex-col"><header className="border-b border-border pb-4"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-text-primary">{selected.thread.subject || "Conversation"}</h2><p className="mt-1 text-sm text-text-secondary">{selected.thread.owner_name || "Visitor"} · {selected.thread.owner_email || "No email"}</p><p className="mt-1 text-xs text-text-tertiary">Source: {selected.thread.source} · Status: {selected.thread.status.replace("_", " ")}</p></div><button type="button" onClick={() => setSelected(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border" aria-label="Close conversation"><X className="h-4 w-4" /></button></div></header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4">{selected.messages.map((message) => <article key={message.id} className={message.is_internal_note ? "rounded-xl border border-dashed border-border bg-background/35 p-3 text-sm text-text-secondary" : message.sender_type === "admin" ? "ml-8 rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground" : "mr-8 rounded-2xl border border-border bg-background/45 px-4 py-3 text-sm text-text-primary"}><p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] opacity-70">{message.is_internal_note ? "Internal note" : message.sender_type === "admin" ? "Oriana Wren" : message.public_sender_name}</p><p className="whitespace-pre-wrap">{message.body}</p></article>)}</div>
        <div className="border-t border-border pt-4"><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} maxLength={5000} placeholder="Reply as Oriana Wren..." className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-text-primary" /><div className="mt-3 flex flex-wrap justify-between gap-2"><div className="flex gap-2"><Button variant="secondary" onClick={() => void submit("status", "closed")} disabled={loading}><CheckCircle2 className="mr-2 h-4 w-4" />Close</Button><Button variant="secondary" onClick={() => void submit("status", "archived")} disabled={loading}><Archive className="mr-2 h-4 w-4" />Archive</Button></div><div className="flex gap-2"><Button variant="secondary" onClick={() => void submit("note")} disabled={!reply.trim() || loading}>Internal note</Button><Button onClick={() => void submit("reply")} disabled={!reply.trim() || loading}><Send className="mr-2 h-4 w-4" />Reply</Button></div></div></div>
      </div> : null}
    </section>
  </div>;
}
