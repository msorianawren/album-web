"use client";

import { useState } from "react";
import { Clock, CheckCircle, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Reply {
  id: string;
  author_type: "user" | "admin";
  body: string;
  public_display_name: string;
  created_at: string;
}

interface Thread {
  id: string;
  subject: string;
  message_body: string;
  created_at: string;
  status: string;
  replies: Reply[];
}

export function UserConversationList({ initialThreads }: { initialThreads: Thread[] }) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [replyBody, setReplyBody] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleReplyChange = (id: string, value: string) => {
    setReplyBody((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const handleSendReply = async (threadId: string) => {
    const text = replyBody[threadId]?.trim();
    if (!text) return;

    setSubmitting((prev) => ({ ...prev, [threadId]: true }));
    setErrors((prev) => ({ ...prev, [threadId]: "" }));

    try {
      const res = await fetch(`/api/contact/${threadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to send reply");
      }

      // Add optimistic reply
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === threadId) {
            return {
              ...t,
              status: "new",
              replies: [
                {
                  id: "temp-" + Date.now(),
                  author_type: "user",
                  body: text,
                  public_display_name: "You",
                  created_at: new Date().toISOString(),
                },
                ...t.replies,
              ],
            };
          }
          return t;
        })
      );

      setReplyBody((prev) => ({ ...prev, [threadId]: "" }));
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [threadId]: err.message || "An error occurred." }));
    } finally {
      setSubmitting((prev) => ({ ...prev, [threadId]: false }));
    }
  };

  if (threads.length === 0) return null;

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-semibold text-text-primary mb-8">My Conversations</h2>
      <div className="grid gap-6">
        {threads.map((thread) => {
          // Sort replies chronological for display (oldest first)
          const sortedReplies = [...thread.replies].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          return (
            <div key={thread.id} className="rounded-[1.5rem] border border-border bg-surface p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <div>
                  <h3 className="font-medium text-text-primary text-lg">{thread.subject || "No Subject"}</h3>
                  <p className="text-xs text-text-secondary mt-1">Started on {new Date(thread.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  {thread.status === "read" ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" /> Replied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-600">
                      <Clock className="h-3.5 w-3.5" /> Awaiting Reply
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Initial Message */}
                <div className="bg-background/50 p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">You wrote:</div>
                    <div className="text-[10px] text-text-tertiary ml-auto">{new Date(thread.created_at).toLocaleString()}</div>
                  </div>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{thread.message_body}</p>
                </div>

                {/* Replies */}
                {sortedReplies.map((reply) => (
                  <div 
                    key={reply.id} 
                    className={`p-4 rounded-xl border ${
                      reply.author_type === "admin" 
                        ? "bg-accent/5 border-accent/20 ml-4 sm:ml-8" 
                        : "bg-background/50 border-border mr-4 sm:mr-8"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {reply.author_type === "admin" ? (
                        <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-accent font-bold text-xs">OW</span>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-surface border border-border flex items-center justify-center flex-shrink-0">
                          <span className="text-text-secondary font-bold text-xs">U</span>
                        </div>
                      )}
                      <div>
                        <p className={`text-xs font-bold ${reply.author_type === "admin" ? "text-accent" : "text-text-primary"}`}>
                          {reply.public_display_name} <span className="text-text-tertiary font-normal">replied:</span>
                        </p>
                        <p className="text-[10px] text-text-secondary">{new Date(reply.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-sm text-text-primary whitespace-pre-wrap mt-2">{reply.body}</p>
                  </div>
                ))}

                {/* Reply Form */}
                <div className="pt-4 border-t border-border mt-4">
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={replyBody[thread.id] || ""}
                      onChange={(e) => handleReplyChange(thread.id, e.target.value)}
                      placeholder="Write a reply..."
                      disabled={submitting[thread.id]}
                      maxLength={2000}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none disabled:opacity-50"
                    />
                    {errors[thread.id] && (
                      <p className="text-xs text-red-500">{errors[thread.id]}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-tertiary">
                        {replyBody[thread.id]?.length || 0}/2000
                      </span>
                      <Button
                        onClick={() => handleSendReply(thread.id)}
                        disabled={!replyBody[thread.id]?.trim() || submitting[thread.id]}
                        className="bg-accent text-accent-foreground shrink-0 text-sm h-9 px-4"
                      >
                        {submitting[thread.id] ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
