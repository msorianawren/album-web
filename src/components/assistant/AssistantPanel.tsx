"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, HelpCircle, Lock, MessageSquare, ShieldCheck, X } from "lucide-react";
import { AssistantPet } from "@/components/assistant/AssistantPet";
import {
  ASSISTANT_HANDOFF_STORAGE_KEY,
  ASSISTANT_PANEL_STORAGE_KEY,
  answerAssistantQuestion,
  sanitizeAssistantQuestion,
  type AssistantAnswer,
} from "@/lib/assistant/answer-engine";
import { assistantQuickActions, type AssistantQuickAction } from "@/lib/assistant/knowledge";
import { assistantModeCopy, type AssistantPreferences } from "@/lib/assistant/preferences";
import { AssistantMessageList, type AssistantMessage } from "@/components/assistant/AssistantMessageList";
import { AssistantQuickActions } from "@/components/assistant/AssistantQuickActions";
import { AssistantSearchBox } from "@/components/assistant/AssistantSearchBox";
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

function detectBrowserLocale(): "en" | "vi" {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
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
  const [locale] = useState(detectBrowserLocale);
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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

  function confirmHandoff(message: AssistantMessage) {
    const userQuestion = messages
      .slice(0, messages.findIndex((item) => item.id === message.id))
      .reverse()
      .find((item) => item.role === "user")?.body;
    const safeQuestion = sanitizeAssistantQuestion(userQuestion ?? message.body);

    try {
      window.sessionStorage.setItem(
        ASSISTANT_HANDOFF_STORAGE_KEY,
        JSON.stringify({
          subject: "Assistant handoff",
          message: `Question: ${safeQuestion}\n\nAssistant category: ${message.answer?.intent ?? "unknown"}`,
        }),
      );
    } catch {
      // The Contact page still works without a draft.
    }

    window.location.href = "/contact";
  }

  const portalTarget = typeof document === "undefined" ? null : document.body;

  if (!portalTarget || !open || preferences.mode === "off") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:justify-end sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Oriana Companion"
      data-testid="oriana-companion-overlay"
    >
      <button
        type="button"
        aria-label="Close Oriana Companion"
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
                    Oriana Companion
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-text-primary">
                    Rule-based site helper
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    Companion: {assistantModeCopy[preferences.mode].label}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-primary transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            <div className="rounded-[1.3rem] border border-border bg-background/70 p-4">
              <p className="text-sm leading-relaxed text-text-secondary">
                I can help with albums, private access, downloads, messages, and notifications.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-accent" />
                  Private access
                </span>
                <span className="inline-flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-muted-accent" />
                  Notifications
                </span>
                <span className="inline-flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-accent" />
                  Contact replies
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-accent" />
                  Site rules
                </span>
              </div>
            </div>

            <AssistantQuickActions actions={assistantQuickActions} onSelect={handleQuickAction} />

            {messages.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-border bg-background/45 p-4 text-sm text-text-secondary">
                <HelpCircle className="mb-3 h-5 w-5 text-muted-accent" />
                Ask in English or Vietnamese. I only answer from website rules and safe account status.
              </div>
            ) : (
              <AssistantMessageList
                messages={messages}
                onQuickAction={handleQuickAction}
                onHandoff={setHandoffMessage}
              />
            )}
          </div>

          {handoffMessage ? (
            <div className="border-t border-border bg-background/75 p-4">
              <p className="text-xs leading-relaxed text-text-secondary">
                Send this question to Contact? Nothing is sent automatically; the Contact page will open with a draft.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => confirmHandoff(handoffMessage)}
                  className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent-foreground"
                >
                  Open Contact Draft
                </button>
                <button
                  type="button"
                  onClick={() => setHandoffMessage(null)}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <footer className="border-t border-border bg-surface p-4">
            <AssistantSearchBox onSubmit={answer} />
            <p className="mt-3 text-[0.68rem] leading-relaxed text-text-secondary">
              This helper only uses website rules and your own account status.
            </p>
          </footer>
        </div>
      </section>
    </div>,
    portalTarget,
  );
}
