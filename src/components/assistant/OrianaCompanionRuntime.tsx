"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { AssistantPet } from "@/components/assistant/AssistantPet";
import { useStoredAssistantPreferences } from "@/hooks/useAssistantPreferences";
import { readSelectedAssistantLocale } from "@/lib/assistant/locales";
import {
  isOrianaCompanionRuntimePath,
  ORIANA_COMPANION_OPEN_EVENT,
  ORIANA_MEDIA_VIEWER_STATE_EVENT,
} from "@/lib/assistant/runtime-events";
import { getAssistantUICopy } from "@/lib/assistant/ui-copy";
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

export function OrianaCompanionRuntime({ session, telegram }: OrianaCompanionRuntimeProps) {
  const preferences = useStoredAssistantPreferences();
  const copy = getAssistantUICopy(readSelectedAssistantLocale());
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
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
  const routeAllowsRuntime = isOrianaCompanionRuntimePath(pathname);
  const canUseRuntime = routeAllowsRuntime
    && preferences.mode !== "off"
    && !mediaViewerOpen
    && !gameRuntimeSuspended;
  const currentDismissKey = `${pathname}:${preferences.mode}`;
  const dismissed = dismissedKey === currentDismissKey;
  const shouldShowDock =
    canUseRuntime && !dismissed && (preferences.mode === "helpful" || preferences.mode === "expressive");
  const currentPath = useMemo(() => getCurrentPath(pathname), [pathname]);

  const [hasOpened, setHasOpened] = useState(false);
  const openPanel = useCallback(() => {
    setHasOpened(true);
    setOpen(true);
  }, []);

  useEffect(() => {
    function handleOpen() {
      if (canUseRuntime) openPanel();
    }

    window.addEventListener(ORIANA_COMPANION_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(ORIANA_COMPANION_OPEN_EVENT, handleOpen);
  }, [canUseRuntime, openPanel]);

  return (
    <>
      {shouldShowDock ? (
        <div
          className={cn(
            "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[55] flex items-end gap-2",
            "sm:bottom-5 sm:right-5",
          )}
          data-testid="oriana-companion-dock"
        >
          <button
            type="button"
            className={cn(
              "group flex min-h-14 items-center gap-3 rounded-full border border-border bg-surface/92 px-3 py-2 text-text-primary shadow-2xl shadow-text-primary/15 backdrop-blur-xl",
              "transition duration-300 hover:-translate-y-0.5 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              preferences.mode === "expressive" ? "pr-4" : "px-4",
            )}
            onClick={openPanel}
            aria-label={copy.inputLabel}
          >
            {preferences.mode === "expressive" ? (
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/75">
                <AssistantPet
                  character={preferences.character}
                  mood={preferences.motion === "reduced" ? "idle" : "qa"}
                  size="xs"
                  decorative
                />
              </span>
            ) : (
              <Sparkles className="h-5 w-5 text-muted-accent" aria-hidden="true" />
            )}
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

      {hasOpened && canUseRuntime ? (
        <AssistantPanel
          open={open}
          onClose={() => setOpen(false)}
          preferences={preferences}
          session={session}
          telegram={telegram}
          currentPath={currentPath}
        />
      ) : null}
    </>
  );
}
