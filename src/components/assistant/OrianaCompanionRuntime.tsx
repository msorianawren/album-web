"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { MessageCircle, X } from "lucide-react";
import { AssistantPet } from "@/components/assistant/AssistantPet";
import { useStoredAssistantPreferences } from "@/hooks/useAssistantPreferences";
import {
  DEFAULT_ASSISTANT_LOCALE,
  readSelectedAssistantLocale,
  subscribeAssistantLocale,
} from "@/lib/assistant/locales";
import {
  companionStateDefinitions,
  companionStateMicrocopy,
  resolveCompanionTransition,
  shouldAnnounceCompanionState,
  type CompanionEvent,
  type CompanionStateSnapshot,
} from "@/lib/assistant/companion-state-machine";
import { resolveCompanionRuntimeBehavior } from "@/lib/assistant/preferences";
import {
  isOrianaCompanionRuntimePath,
  ORIANA_COMPANION_CONTEXT_EVENT,
  ORIANA_COMPANION_OPEN_EVENT,
  ORIANA_MEDIA_VIEWER_STATE_EVENT,
  type CompanionContextEventDetail,
} from "@/lib/assistant/runtime-events";
import { getAssistantUICopy } from "@/lib/assistant/ui-copy";
import { playCompanionChime } from "@/lib/assistant/sound";
import { cn } from "@/lib/utils";
import type { PublicSession } from "@/lib/types";
import type { PublicTelegramContact } from "@/lib/contact/telegram";
import {
  getGameRuntimeSuspensionSnapshot,
  getServerGameRuntimeSuspensionSnapshot,
  subscribeGameRuntimeSuspension,
} from "@/games/core/runtime";

const AssistantPanel = dynamic(
  () => import("@/components/assistant/AssistantPanel").then((mod) => mod.AssistantPanel),
  { ssr: false },
);

interface OrianaCompanionRuntimeProps {
  session: PublicSession;
  telegram: PublicTelegramContact | null;
}

function getCurrentPath(pathname: string) {
  if (typeof window === "undefined") return pathname || "/";
  return `${pathname || "/"}${window.location.search}`;
}

function subscribeMediaViewerState(callback: () => void) {
  window.addEventListener(ORIANA_MEDIA_VIEWER_STATE_EVENT, callback);
  return () => window.removeEventListener(ORIANA_MEDIA_VIEWER_STATE_EVENT, callback);
}

function getMediaViewerSnapshot() {
  return typeof document !== "undefined" && document.body.dataset.orianaMediaViewerOpen === "true";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function eventForContext(detail: CompanionContextEventDetail): CompanionEvent {
  return detail.kind;
}

export function OrianaCompanionRuntime({ session, telegram }: OrianaCompanionRuntimeProps) {
  const preferences = useStoredAssistantPreferences();
  const locale = useSyncExternalStore(
    subscribeAssistantLocale,
    readSelectedAssistantLocale,
    () => DEFAULT_ASSISTANT_LOCALE,
  );
  const copy = getAssistantUICopy(locale);
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [state, setState] = useState<CompanionStateSnapshot>({ state: "idle", since: 0 });
  const reducedMotion = usePrefersReducedMotion();
  const mediaViewerOpen = useSyncExternalStore(
    subscribeMediaViewerState,
    getMediaViewerSnapshot,
    () => false,
  );
  const gameRuntimeSuspended = useSyncExternalStore(
    subscribeGameRuntimeSuspension,
    getGameRuntimeSuspensionSnapshot,
    getServerGameRuntimeSuspensionSnapshot,
  );
  const behavior = resolveCompanionRuntimeBehavior(preferences, { reducedMotion });
  const routeAllowsRuntime = isOrianaCompanionRuntimePath(pathname);
  const canUseRuntime = routeAllowsRuntime
    && behavior.runtimeEnabled
    && !mediaViewerOpen
    && !gameRuntimeSuspended;
  const currentDismissKey = `${pathname}:${preferences.presence}`;
  const dismissed = dismissedKey === currentDismissKey;
  const shouldShowDock = canUseRuntime && !dismissed && behavior.persistentDockEnabled;
  const currentPath = useMemo(() => getCurrentPath(pathname), [pathname]);

  const dispatchStateEvent = useCallback((event: CompanionEvent) => {
    setState((current) => resolveCompanionTransition(current, event));
  }, []);

  useEffect(() => {
    document.body.dataset.orianaCompanionRuntime = "ready";
    return () => {
      delete document.body.dataset.orianaCompanionRuntime;
    };
  }, []);

  const openPanel = useCallback(() => {
    if (!canUseRuntime || !behavior.manualTriggerEnabled) return;
    setHasOpened(true);
    setOpen(true);
  }, [behavior.manualTriggerEnabled, canUseRuntime]);

  useEffect(() => {
    function handleOpen() {
      openPanel();
    }
    window.addEventListener(ORIANA_COMPANION_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(ORIANA_COMPANION_OPEN_EVENT, handleOpen);
  }, [openPanel]);

  useEffect(() => {
    function handleContext(event: Event) {
      if (!canUseRuntime || !behavior.contextualGuidanceEnabled) return;
      const detail = (event as CustomEvent<CompanionContextEventDetail>).detail;
      if (!detail) return;
      dispatchStateEvent(eventForContext(detail));
      setHasOpened(true);
      setOpen(true);
    }
    window.addEventListener(ORIANA_COMPANION_CONTEXT_EVENT, handleContext);
    return () => window.removeEventListener(ORIANA_COMPANION_CONTEXT_EVENT, handleContext);
  }, [behavior.contextualGuidanceEnabled, canUseRuntime, dispatchStateEvent]);

  useEffect(() => {
    if (!behavior.idleReactionsEnabled || open || !canUseRuntime) return;
    const timer = window.setTimeout(() => dispatchStateEvent("idle_timeout"), 20_000);
    return () => window.clearTimeout(timer);
  }, [behavior.idleReactionsEnabled, canUseRuntime, dispatchStateEvent, open]);

  const stateLabel = companionStateDefinitions[state.state].label;
  const announceState = shouldAnnounceCompanionState(state.state);

  return (
    <>
      {shouldShowDock ? (
        <div
          className={cn(
            "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[55] flex items-end gap-2",
            "sm:bottom-5 sm:right-5",
          )}
          data-testid="oriana-companion-dock"
          data-companion-state={state.state}
        >
          <button
            type="button"
            className="group flex min-h-14 items-center gap-3 rounded-full border border-border bg-surface/92 px-3 py-2 pr-4 text-text-primary shadow-2xl shadow-text-primary/15 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              dispatchStateEvent("pet");
              if (behavior.soundEnabled) playCompanionChime();
              openPanel();
            }}
            aria-label={copy.inputLabel}
          >
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-background/75">
              <AssistantPet
                character={preferences.character}
                state={state.state}
                motion={behavior.motion}
                size="xs"
                priority
                decorative
              />
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] sm:inline">
              {copy.askDock}
            </span>
            <MessageCircle className="h-4 w-4 text-text-secondary sm:hidden" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface/90 text-text-secondary shadow-lg shadow-text-primary/10 backdrop-blur transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setDismissedKey(currentDismissKey)}
            aria-label={copy.hideDock}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <span className="sr-only" role={announceState ? "status" : undefined} aria-live={announceState ? "polite" : "off"}>
        {announceState ? `${stateLabel}. ${companionStateMicrocopy(state.state)}` : ""}
      </span>

      {hasOpened && canUseRuntime ? (
        <AssistantPanel
          open={open && canUseRuntime}
          onClose={() => setOpen(false)}
          preferences={preferences}
          session={session}
          telegram={telegram}
          currentPath={currentPath}
          onCompanionEvent={dispatchStateEvent}
        />
      ) : null}
    </>
  );
}
