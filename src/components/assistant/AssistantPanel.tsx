"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Bell, Copy, HelpCircle, Lock, MessageSquare, Send, ShieldCheck, X } from "lucide-react";
import { AssistantPet } from "@/components/assistant/AssistantPet";
import {
  ASSISTANT_PANEL_STORAGE_KEY,
  answerAssistantQuestion,
  sanitizeAssistantQuestion,
  type AssistantAnswer,
} from "@/lib/assistant/answer-engine";
import { getAssistantQuickActions, getPuzzleAssistantQuickActions, type AssistantQuickAction } from "@/lib/assistant/knowledge";
import {
  DEFAULT_ASSISTANT_LOCALE,
  readSelectedAssistantLocale,
  subscribeAssistantLocale,
  type AssistantLocale,
} from "@/lib/assistant/locales";
import { getAssistantUICopy } from "@/lib/assistant/ui-copy";
import { getCompanionPreset, type AssistantPreferences } from "@/lib/assistant/preferences";
import type { CompanionEvent } from "@/lib/assistant/companion-state-machine";
import { AssistantMessageList, type AssistantMessage } from "@/components/assistant/AssistantMessageList";
import { AssistantQuickActions } from "@/components/assistant/AssistantQuickActions";
import { AssistantSearchBox } from "@/components/assistant/AssistantSearchBox";
import { HelpThreadConversation } from "@/components/help/HelpThreadConversation";
import { cn } from "@/lib/utils";
import type { PublicSession } from "@/lib/types";
import type { PublicTelegramContact } from "@/lib/contact/telegram";

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
  preferences: AssistantPreferences;
  session: PublicSession;
  currentPath: string;
  telegram: PublicTelegramContact | null;
  onCompanionEvent?: (event: CompanionEvent) => void;
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
  telegram,
  onCompanionEvent,
}: AssistantPanelProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [notificationCount, setNotificationCount] = useState<number | null>(null);
  const [handoffMessage, setHandoffMessage] = useState<AssistantMessage | null>(null);
  const [helpThreadId, setHelpThreadId] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState("");
  const [telegramFeedback, setTelegramFeedback] = useState("");
  const locale: AssistantLocale = useSyncExternalStore(
    subscribeAssistantLocale,
    readSelectedAssistantLocale,
    () => DEFAULT_ASSISTANT_LOCALE,
  );
  const panelRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const copy = getAssistantUICopy(locale);
  const quickActions = currentPath === "/games" ? getPuzzleAssistantQuickActions(locale) : getAssistantQuickActions(locale);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => panelRef.current?.focus(), 0);

    const previousOverflow = document.body.style.overflow;
    const background = (Array.from(document.body.children) as HTMLElement[]).filter((node) => node !== overlayRef.current);
    const previousInert = background.map((node) => ({ node, inert: node.inert, ariaHidden: node.getAttribute("aria-hidden") }));
    document.body.style.overflow = "hidden";
    background.forEach((node) => {
      node.inert = true;
      node.setAttribute("aria-hidden", "true");
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hidden && element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousInert.forEach(({ node, inert, ariaHidden }) => {
        node.inert = inert;
        if (ariaHidden === null) node.removeAttribute("aria-hidden");
        else node.setAttribute("aria-hidden", ariaHidden);
      });
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  async function copyTelegramUsername() {
    if (!telegram) return;
    try {
      await navigator.clipboard.writeText(telegram.displayUsername);
      setTelegramFeedback("Telegram username copied.");
    } catch {
      setTelegramFeedback(`Copy unavailable. Please copy ${telegram.displayUsername}.`);
    }
  }

  useEffect(() => {
    if (!open) return;
    writePanelMemory();
    onCompanionEvent?.("panel_opened");
    return () => onCompanionEvent?.("panel_closed");
  }, [onCompanionEvent, open]);

  useEffect(() => {
    if (!open || !session.userId) return;
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
    onCompanionEvent?.("answer_lookup_started");

    const response = answerAssistantQuestion(safeQuestion, {
      locale,
      isAuthenticated: Boolean(session.userId),
      currentPath,
      assistantHelpLevel: preferences.helpLevel,
      notificationCount,
    });

    onCompanionEvent?.(response.intent === "unknown" ? "answer_unknown" : "answer_found");

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
    const gameActions: Record<string, string> = {
      game_valid_moves: "valid-moves",
      game_reference: "reference",
      game_restart: "restart",
    };
    const gameAction = gameActions[action.id];
    if (gameAction && currentPath === "/games") {
      document.dispatchEvent(new CustomEvent("oriana-games-assist", { detail: { action: gameAction } }));
    }
    if (action.href && action.href.startsWith("/")) {
      window.location.assign(action.href);
      return;
    }
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
    onCompanionEvent?.("operation_pending");
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
      onCompanionEvent?.("operation_succeeded");
    } catch (error) {
      setHandoffError(error instanceof Error ? error.message : "Could not start a conversation.");
      onCompanionEvent?.("operation_failed");
    }
  }

  const portalTarget = typeof document === "undefined" ? null : document.body;

  if (!portalTarget || !open || preferences.presence === "hidden") return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:justify-end sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="oriana-companion-title"
      data-testid="oriana-companion-overlay"
    >
      <button
        type="button"
        aria-label={copy.closeLabel}
        className="absolute inset-0 cursor-default bg-black/[0.08] dark:bg-black/20"
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
                    state="listening"
                    motion={preferences.motion}
                    size="sm"
                    decorative
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                    {copy.title}
                  </p>
                  <h2 id="oriana-companion-title" className="mt-1 truncate text-lg font-semibold text-text-primary">
                    {copy.subtitle}
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    {copy.companionLabel}: {getCompanionPreset(preferences) === "custom"
                      ? "Custom"
                      : getCompanionPreset(preferences).replace("_", " ")}
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

            {telegram ? (
              <aside className="rounded-[1.3rem] border border-border bg-surface/85 p-4 shadow-sm shadow-text-primary/5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Talk to Oriana directly</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm font-semibold text-text-primary">Telegram</p><p className="truncate text-sm text-text-secondary">{telegram.displayUsername}</p></div>
                  <Send className="h-5 w-5 shrink-0 text-muted-accent" aria-hidden="true" />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <a href={telegram.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent-foreground transition duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Message Oriana on Telegram as ${telegram.displayUsername}`}>Message Oriana</a>
                  <button type="button" onClick={copyTelegramUsername} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary transition duration-200 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Copy Telegram username ${telegram.displayUsername}`}><Copy className="h-3.5 w-3.5" aria-hidden="true" />Copy username</button>
                </div>
                {telegramFeedback ? <p className="mt-3 text-xs text-text-secondary" role="status">{telegramFeedback}</p> : null}
              </aside>
            ) : null}
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
              onTyping={() => onCompanionEvent?.("user_typing")}
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
