"use client";

import { useState } from "react";
import { Clock, CheckCircle2, Archive, Trash2, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { updateMessageStatus } from "./actions";
import { Button } from "@/components/ui/Button";

interface Message {
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
}

export function MessageList({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: string) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );
    try {
      await updateMessageStatus(id, status);
    } catch (error) {
      console.error("Failed to update status", error);
      // Revert if needed
    }
  };

  const getStatusBadge = (status: string, riskLevel: string) => {
    if (status === "new") return <span className="flex items-center gap-1 rounded bg-accent/10 px-2 py-1 text-xs font-semibold text-accent-foreground uppercase"><Clock className="h-3 w-3" /> New</span>;
    if (status === "read") return <span className="flex items-center gap-1 rounded bg-background px-2 py-1 text-xs font-semibold text-text-secondary uppercase"><CheckCircle2 className="h-3 w-3" /> Read</span>;
    if (status === "archived") return <span className="flex items-center gap-1 rounded bg-surface px-2 py-1 text-xs font-semibold text-text-secondary uppercase"><Archive className="h-3 w-3" /> Archived</span>;
    if (status === "spam" || riskLevel === "high") return <span className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-500 uppercase"><ShieldAlert className="h-3 w-3" /> Spam</span>;
    return <span className="flex items-center gap-1 rounded bg-background px-2 py-1 text-xs font-semibold text-text-secondary uppercase">{status}</span>;
  };

  const visibleMessages = messages.filter(m => m.status !== "deleted");

  if (visibleMessages.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-text-secondary">
        Your inbox is empty.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {visibleMessages.map((msg) => {
        const isExpanded = expandedId === msg.id;
        return (
          <div
            key={msg.id}
            className={`flex flex-col gap-4 rounded-[1.4rem] border border-border bg-surface/80 p-5 shadow-sm transition-colors ${msg.status === "new" ? "border-accent/30 bg-surface" : ""}`}
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusBadge(msg.status, msg.risk_level)}
                  <span className="text-xs font-medium text-text-secondary">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                  <span className="text-xs font-medium bg-background px-2 py-0.5 rounded text-text-tertiary">
                    {msg.inquiry_type}
                  </span>
                </div>
                <div className="flex items-center gap-2 opacity-50 transition-opacity hover:opacity-100">
                  {msg.status === "new" && (
                    <Button variant="icon" onClick={() => handleStatusChange(msg.id, "read")} title="Mark as Read">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  {msg.status !== "archived" && (
                    <Button variant="icon" onClick={() => handleStatusChange(msg.id, "archived")} title="Archive">
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  {msg.status !== "spam" && (
                    <Button variant="icon" onClick={() => handleStatusChange(msg.id, "spam")} title="Mark as Spam">
                      <ShieldAlert className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="icon" onClick={() => handleStatusChange(msg.id, "deleted")} title="Delete">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-text-primary">{msg.subject}</h3>
              
              <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                <span className="font-medium text-text-primary">{msg.name}</span>
                <span>&bull;</span>
                <a href={`mailto:${msg.reply_email}`} className="text-accent hover:underline">
                  {msg.reply_email}
                </a>
              </div>
              
              <div className="mt-4 rounded-xl border border-border bg-background/50 p-4 text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                {isExpanded ? msg.message_body : msg.message_preview + (msg.message_body?.length > 200 ? "..." : "")}
              </div>

              {msg.message_body?.length > 200 && (
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : msg.id);
                    if (!isExpanded && msg.status === "new") handleStatusChange(msg.id, "read");
                  }}
                  className="mt-3 flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show Less</> : <><ChevronDown className="h-3 w-3" /> Read Full Message</>}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
