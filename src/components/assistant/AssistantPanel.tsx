"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, HelpCircle, Lock, MessageSquare, ShieldCheck, X } from "lucide-react";
import { AssistantPet } from "@/components/assistant/AssistantPet";
import {
  ASSISTANT_PANEL_STORAGE_KEY,
  answerAssistantQuestion,
  sanitizeAssistantQuestion,
  type AssistantAnswer,
} from "@/lib/assistant/answer-engine";
import { getAssistantQuickActions, type AssistantQuickAction } from "@/lib/assistant/knowledge";
import {
  readSelectedAssistantLocale,
  type AssistantLocale,
} from "@/lib/assistant/locales";
import { getAssistantUICopy } from "@/lib/assistant/ui-copy";
import { assistantModeCopy, type AssistantPreferences } from "@/lib/assistant/preferences";
import { AssistantMessageList, type AssistantMessage } from "@/components/assistant/AssistantMessageList";
import { AssistantQuickActions } from "@/components/assistant/AssistantQuickActions";
import { AssistantSearchBox } from "@/components/assistant/AssistantSearchBox";
import { HelpThreadConversation } from "@/components/help/HelpThreadConversation";
import { cn } from "@/lib/utils";
import type { PublicSession } from "@/lib/types";

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
  preferences: AssistantPreferences;
  session: PublicSession;
  currentPath: string;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createAssistantMessage(answer: AssistantAnswer): AssistantMessage {
  return {
    id: makeId("assistant"),
    role: "assistant",
    body: answer.answer,
    answer,
  };
}

function writePanelMemory(recentQuickActionId?: string) {
  try {
    window.localStorage.setItem(
      ASSISTANT_PANEL_STORAGE_KEY,
      JSON.stringify({
        lastOpenedAt: new Date().toISOString(),
        ...(recentQuickActionId ? { recentQuickActionId } : {}),
      }),
    );
  } catch {
    // Local-only panel memory is optional.
  }
}

export function AssistantPanel({
  open,
  onClose,
  preferences,
  session,
  currentPath,
}: AssistantPanelProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [notificationCount, setNotificationCount] = useState<number | null>(null);
  const [handoffMessage, setHandoffMessage] = useState<AssistantMessage | null>(null);
  const [helpThreadId, setHelpThreadId] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState("");
  const locale: AssistantLocale = readSelectedAssistantLocale();
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const copy = getAssistantUICopy(locale);
  const quickActions = getAssistantQuickActions(locale);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => panelRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    writePanelMemory();

    if (!session.userId) return;
    let active = true;
    fetch("/api/notifications?mode=count", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active && typeof payload?.count === "number") {
          setNotificationCount(payload.count);
        }
      })
      .catch(() => {
        if (active) setNotificationCount(null);
      });

    return () => {
      active = false;
    };
  }, [open, session.userId]);

  function answer(question: string) {
    const safeQuestion = sanitizeAssistantQuestion(question);
    if (!safeQuestion) return;

    const response = answerAssistantQuestion(safeQuestion, {
      locale,
      isAuthenticated: Boolean(session.userId),
      currentPath,
      assistantMode: preferences.mode,
      notificationCount,
    });

    setMessages((current) => [
      ...current,
      {
        id: makeId("user"),
        role: "user",
        body: safeQuestion,
      },
      createAssistantMessage(response),
    ]);
    setHandoffMessage(null);
  }

  function handleQuickAction(action: AssistantQuickAction) {
    writePanelMemory(action.id);
    answer(action.question);
  }

  async function confirmHandoff(message: AssistantMessage) {
    const userQuestion = messages
      .slice(0, messages.findIndex((item) => item.id === message.id))
      .reverse()
      .find((item) => item.role === "user")?.body;
    const safeQuestion = sanitizeAssistantQuestion(userQuestion ?? message.body);

    if (!session.userId) {
      window.location.href = `/login?next=${encodeURIComponent(currentPath || "/contact")}`;
      return;
    }
    setHandoffError("");
    try {
      const response = await fetch("/api/help/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "assistant", subject: "Assistant handoff", body: safeQuestion, assistantIntent: message.answer?.intent ?? "unknown" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not start a conversation.");
      setHandoffMessage(null);
      setHelpThreadId(payload.thread.id);
    } catch (error) {
      setHandoffError(error instanceof Error ? error.message : "Could not start a conversation.");
    }
  }

  const portalTarget = typeof document === "undefined" ? null : document.body;

  if (!portalTarget || !open || preferences.mode === "off") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:justify-end sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      data-testid="oriana-companion-overlay"
    >
      <button
        type="button"
        aria-label={copy.closeLabel}
        className="absolute inset-0 bg-text-primary/45 backdrop-blur-md"
        onClick={onClose}
      />
      <section
        ref={panelRef}
        tabIndex={-1}
        data-testid="oriana-companion-panel"
        className={cn(
          "relative z-10 flex w-full max-h-[min(88dvh,720px)] flex-col overflow-hidden rounded-t-[2rem] border border-border bg-surface shadow-2xl shadow-text-primary/25 outline-none",
          "sm:h-[min(720px,calc(100dvh-32px))] sm:w-[min(420px,calc(100vw-32px))] sm:rounded-[2rem]",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {helpThreadId ? <HelpThreadConversation threadId={helpThreadId} onBack={() => setHelpThreadId(null)} /> : <>
          <header className="border-b border-border bg-background/55 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] border border-border bg-surface">
                  <AssistantPet
                    character={preferences.character}
                    mood={preferences.motion === "reduced" ? "idle" : "qa"}
                    size="sm"
                    decorative
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                    {copy.title}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-text-primary">
                    {copy.subtitle}
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    {copy.companionLabel}: {assistantModeCopy[preferences.mode].label}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-primary transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={copy.closeLabel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            <div className="rounded-[1.3rem] border border-border bg-background/70 p-4">
              <p className="text-sm leading-relaxed text-text-secondary">
                {copy.greeting}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-accent" />
                  {copy.privateAccess}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-muted-accent" />
                  {copy.notifications}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-accent" />
                  {copy.contactReplies}
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-accent" />
                  {copy.siteRules}
                </span>
              </div>
            </div>

            <AssistantQuickActions actions={quickActions} onSelect={handleQuickAction} />

            {messages.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-border bg-background/45 p-4 text-sm text-text-secondary">
                <HelpCircle className="mb-3 h-5 w-5 text-muted-accent" />
                {copy.emptyState}
              </div>
            ) : (
              <AssistantMessageList
                messages={messages}
                onQuickAction={handleQuickAction}
                onHandoff={setHandoffMessage}
                openPathLabel={copy.openPath}
                sendToContactLabel={copy.sendToContact}
              />
            )}
          </div>

          {handoffMessage ? (
            <div className="border-t border-border bg-background/75 p-4">
              <p className="text-xs leading-relaxed text-text-secondary">
                {copy.handoffPrompt}
              </p>
              {handoffError ? <p className="mt-2 text-xs text-red-600">{handoffError}</p> : null}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => confirmHandoff(handoffMessage)}
                  className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent-foreground"
                >
                  {copy.openContactDraft}
                </button>
                <button
                  type="button"
                  onClick={() => setHandoffMessage(null)}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary"
                >
                  {copy.cancel}
                </button>
              </div>
            </div>
          ) : null}

          <footer className="border-t border-border bg-surface p-4">
            <AssistantSearchBox
              onSubmit={answer}
              placeholder={copy.inputPlaceholder}
              inputLabel={copy.inputLabel}
              sendLabel={copy.sendLabel}
            />
            <p className="mt-3 text-[0.68rem] leading-relaxed text-text-secondary">
              {copy.privacyNote}
            </p>
          </footer>
          </>}
        </div>
      </section>
    </div>,
    portalTarget,
  );
}
