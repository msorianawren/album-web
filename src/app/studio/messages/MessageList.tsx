"use client";

import { useState } from "react";
import { Clock, CheckCircle2, Archive, Trash2, ShieldAlert, ChevronDown, ChevronUp, Reply, Send } from "lucide-react";
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
  reply_text?: string | null;
  replied_at?: string | null;
}

export function MessageList({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Reply states
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

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

  const handleSendReply = async (id: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    
    try {
      const res = await fetch(`/api/studio/messages/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error?.message || "Failed to send reply.");
        return;
      }
      
      // Update local state to show it was replied to
      setMessages(prev => prev.map(m => m.id === id ? { 
        ...m, 
        reply_text: replyText, 
        replied_at: new Date().toISOString(),
        status: "read"
      } : m));
      
      setReplyingToId(null);
      setReplyText("");
      alert("Email sent successfully!");
    } catch (error) {
      alert("An unexpected error occurred.");
      console.error(error);
    } finally {
      setSendingReply(false);
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
        const isReplying = replyingToId === msg.id;
        
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
                  {msg.replied_at && (
                    <span className="text-xs font-medium bg-green-500/10 text-green-600 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Replied
                    </span>
                  )}
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
                <span className="text-text-secondary">{msg.reply_email}</span>
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
              
              {/* Previous Reply Display */}
              {msg.reply_text && (
                <div className="mt-4 pl-4 border-l-2 border-accent/30">
                  <p className="text-xs font-semibold text-accent mb-1 flex items-center gap-1">
                    <Reply className="w-3 h-3" /> You replied on {new Date(msg.replied_at!).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">
                    {msg.reply_text}
                  </p>
                </div>
              )}
              
              {/* Reply Button / Box */}
              {!msg.reply_text && (
                <div className="mt-5 border-t border-border pt-4">
                  {!isReplying ? (
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        setReplyingToId(msg.id);
                        setReplyText("");
                        if (msg.status === "new") handleStatusChange(msg.id, "read");
                      }}
                      className="text-xs"
                    >
                      <Reply className="w-3 h-3 mr-2" /> Reply to Message
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-xs font-medium text-text-secondary">
                        Replying as: <span className="font-bold text-text-primary">Oriana Wren</span>
                      </label>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply here. This will be sent as an email to the user..."
                        className="w-full min-h-[120px] rounded-xl border border-border bg-background p-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-muted-accent resize-y"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="ghost" 
                          onClick={() => setReplyingToId(null)}
                          disabled={sendingReply}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => handleSendReply(msg.id)}
                          disabled={sendingReply || !replyText.trim()}
                        >
                          {sendingReply ? "Sending..." : <><Send className="w-3 h-3 mr-2" /> Send Reply</>}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
