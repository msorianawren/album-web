"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { AssistantAnswer } from "@/lib/assistant/answer-engine";
import { AssistantQuickActions } from "@/components/assistant/AssistantQuickActions";
import type { AssistantQuickAction } from "@/lib/assistant/knowledge";
import { cn } from "@/lib/utils";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  body: string;
  answer?: AssistantAnswer;
}

function safeUrl(url: string) {
  return url.startsWith("/") && !url.startsWith("//") ? url : null;
}

interface AssistantMessageListProps {
  messages: AssistantMessage[];
  onQuickAction: (action: AssistantQuickAction) => void;
  onHandoff: (message: AssistantMessage) => void;
  openPathLabel: (path: string) => string;
  sendToContactLabel: string;
}

export function AssistantMessageList({
  messages,
  onQuickAction,
  onHandoff,
  openPathLabel,
  sendToContactLabel,
}: AssistantMessageListProps) {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <article
          key={message.id}
          className={cn(
            "rounded-[1.2rem] border p-4 text-sm leading-relaxed",
            message.role === "user"
              ? "ml-8 border-accent/40 bg-accent/10 text-text-primary"
              : "mr-8 border-border bg-background/70 text-text-secondary",
          )}
        >
          {message.answer?.title ? (
            <h3 className="mb-2 text-sm font-semibold text-text-primary">
              {message.answer.title}
            </h3>
          ) : null}
          <p>{message.body}</p>

          {message.answer?.quickActions.length ? (
            <div className="mt-3">
              <AssistantQuickActions
                actions={message.answer.quickActions}
                onSelect={onQuickAction}
                compact
              />
            </div>
          ) : null}

          {message.answer?.relatedUrls.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.answer.relatedUrls.map((url) => {
                const href = safeUrl(url);
                return href ? (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-text-primary hover:border-accent"
                  >
                    {openPathLabel(href)}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null;
              })}
            </div>
          ) : null}

          {message.answer?.canHandoffToContact && message.answer.intent === "unknown" ? (
            <button
              type="button"
              onClick={() => onHandoff(message)}
              className="mt-3 rounded-full border border-border bg-surface px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-text-primary transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {sendToContactLabel}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
