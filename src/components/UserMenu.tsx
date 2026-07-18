"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LogIn, LogOut, Moon, Sparkles, Sun, Sunrise, UserRound, Shield, Layers3 } from "lucide-react";
import { AssistantPet } from "@/components/assistant/AssistantPet";
import { Avatar } from "@/components/ui/Avatar";
import { useStoredAssistantPreferences } from "@/hooks/useAssistantPreferences";
import { buildLoginHref } from "@/lib/auth-redirect";
import { assistantModeCopy } from "@/lib/assistant/preferences";
import {
  isOrianaCompanionRuntimePath,
  ORIANA_COMPANION_OPEN_EVENT,
} from "@/lib/assistant/runtime-events";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useDepthEffects, type DepthEffectsMode } from "@/hooks/useDepthEffects";
import { useEnvironmentPreferences, useResolvedEnvironmentPhase } from "@/hooks/useEnvironmentPreferences";
import type { PublicSession } from "@/lib/types";
import type { AppDictionary } from "@/lib/i18n";

interface UserMenuProps {
  session: PublicSession;
  dict?: AppDictionary;
}

export function UserMenu({ session, dict }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const { preferences: environmentPreferences, updatePreference: updateEnvironmentPreference } = useEnvironmentPreferences({ userId: session.userId });
  const theme = environmentPreferences.phase;
  useResolvedEnvironmentPhase(theme);
  const assistantPreferences = useStoredAssistantPreferences();
  const { mode: depthEffects, setMode: setDepthEffects } = useDepthEffects();
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const canOpenAssistant =
    assistantPreferences.mode !== "off" && isOrianaCompanionRuntimePath(pathname);

  const name = session.displayName ?? session.email ?? (dict?.common?.guest || "Guest");
  const roleLabel = session.isFounder
    ? (dict?.common?.founder_account || "Founder account")
    : session.isAdmin
      ? (dict?.common?.admin_account || "Admin account")
      : session.userId
        ? (dict?.common?.member_account || "Member account")
        : (dict?.common?.guest || "Guest");

  const initialsName = useMemo(() => name || (dict?.common?.guest || "Guest"), [name, dict]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/";
  }

  function toggleTheme() {
    const modes = ["auto", "day", "sunset", "night"] as const;
    updateEnvironmentPreference("phase", modes[(modes.indexOf(theme) + 1) % modes.length]);
  }

  function cycleDepthEffects() {
    const modes: DepthEffectsMode[] = ["auto", "full", "reduced", "off"];
    setDepthEffects(modes[(modes.indexOf(depthEffects) + 1) % modes.length]);
  }

  return (
    <div ref={menuRef} className="relative ml-auto md:ml-0">
      <button
        type="button"
        className="group flex items-center gap-2 rounded-full border border-border bg-surface/80 p-1 pr-2 shadow-lg shadow-text-primary/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Open user menu"
      >
        <Avatar name={initialsName} imageUrl={session.avatarUrl ?? undefined} />
        {session.userId && (
          <span className="hidden max-w-[120px] truncate text-xs font-semibold text-text-primary md:block">
            {name}
          </span>
        )}
      </button>

      <div
        data-oriana-menu-open={open ? "true" : "false"}
        className={`fixed left-4 right-4 top-[5.25rem] z-50 max-h-[calc(100vh-6.5rem)] origin-top rounded-[1.4rem] border border-border bg-surface/95 p-3 shadow-2xl shadow-text-primary/20 backdrop-blur-xl transition duration-200 overflow-y-auto sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[min(20rem,calc(100vw-2rem))] sm:max-h-[calc(100vh-5rem)] sm:origin-top-right ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 rounded-[1rem] bg-background/75 p-3 mb-2">
          <Avatar name={initialsName} imageUrl={session.avatarUrl ?? undefined} className="h-12 w-12" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{roleLabel}</p>
            {session.email ? (
              <p className="mt-1 truncate text-xs text-text-secondary">{session.email}</p>
            ) : null}
          </div>
        </div>

        <div className="mb-2">
          <p className="px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-text-secondary/70">Display</p>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={toggleTheme}
          >
            <span className="inline-flex items-center gap-3">
              <span className="relative h-4 w-4 text-muted-accent" aria-hidden="true">
                {theme === "night" && <Moon className="h-4 w-4" />}
                {theme === "day" && <Sun className="h-4 w-4" />}
                {theme === "sunset" && <Sunrise className="h-4 w-4" />}
                {theme === "auto" && <span className="h-4 w-4 flex items-center justify-center font-serif text-[10px] uppercase font-bold border border-muted-accent rounded-full">A</span>}
              </span>
              {dict?.common?.theme_mode || "Theme mode"}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-background border border-border px-2 py-0.5 rounded-full">
              {theme}
            </span>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={cycleDepthEffects}
          >
            <span className="inline-flex items-center gap-3">
              <Layers3 className="h-4 w-4 text-muted-accent" aria-hidden="true" />
              Depth effects
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-background border border-border px-2 py-0.5 rounded-full">
              {depthEffects}
            </span>
          </button>
          <LanguageSwitcher dict={dict} />
        </div>

        <div className="mb-2">
          <p className="px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-text-secondary/70">Account</p>
          <Link
            href="/profile"
            className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserRound className="h-4 w-4 text-muted-accent" aria-hidden="true" />
            {dict?.nav?.profile || "My Profile & Rules"}
          </Link>

          {session.userId ? (
            <Link
              href="/games"
              className="flex w-full items-center justify-between gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="inline-flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-muted-accent" aria-hidden="true" />
                Wren Feathers
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold tabular-nums text-text-secondary">
                {session.wrenFeathers ?? 0}
              </span>
            </Link>
          ) : null}

          {canOpenAssistant ? (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                window.dispatchEvent(new Event(ORIANA_COMPANION_OPEN_EVENT));
                setOpen(false);
              }}
            >
              <Sparkles className="h-4 w-4 text-muted-accent" aria-hidden="true" />
              Ask Oriana Companion
            </button>
          ) : null}

          <Link
            href="/profile#oriana-companion"
            className="flex w-full items-center justify-between gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="inline-flex min-w-0 items-center gap-3">
              {assistantPreferences.mode === "off" ? (
                <Sparkles className="h-4 w-4 shrink-0 text-muted-accent" aria-hidden="true" />
              ) : (
                <AssistantPet
                  character={assistantPreferences.character}
                  mood="idle"
                  size="xs"
                  decorative
                />
              )}
              <span className="truncate">Assistant preferences</span>
            </span>
            {assistantPreferences.mode !== "off" ? (
              <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Companion: {assistantModeCopy[assistantPreferences.mode].label}
              </span>
            ) : null}
          </Link>

          {session.isAdmin ? (
            <Link
              href="/studio"
              className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Shield className="h-4 w-4 text-muted-accent" aria-hidden="true" />
              {dict?.nav?.studio || "Studio"}
            </Link>
          ) : null}

          {session.userId ? (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-500/80 hover:text-red-500"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {dict?.common?.logout || "Logout"}
            </button>
          ) : (
            <Link
              href={buildLoginHref(pathname, searchParams)}
              className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogIn className="h-4 w-4 text-muted-accent" aria-hidden="true" />
              {dict?.nav?.login || "Login"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
