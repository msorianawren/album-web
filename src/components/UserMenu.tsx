"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Globe2, LogIn, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { localeMeta, supportedLocales, useI18n, type Locale } from "@/lib/i18n-client";
import type { PublicSession } from "@/lib/types";

type ThemeMode = "day" | "night";

interface UserMenuProps {
  session: PublicSession;
}

const themeEvent = "album-theme-change";

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "day";
  return localStorage.getItem("album-theme") === "night" ? "night" : "day";
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(themeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(themeEvent, callback);
  };
}

function syncThemeClass(mode: ThemeMode) {
  document.documentElement.classList.toggle("theme-night", mode === "night");
}

export function UserMenu({ session }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const theme = useSyncExternalStore(subscribeTheme, getStoredTheme, () => "day" as ThemeMode);
  const menuRef = useRef<HTMLDivElement>(null);

  const name = session.displayName ?? session.email ?? t("user.guest");
  const roleLabel = session.isFounder
    ? t("user.founder")
    : session.isAdmin
      ? t("user.admin")
      : session.userId
        ? t("user.member")
        : t("user.guestRole");

  const initialsName = useMemo(() => name || t("user.guest"), [name, t]);

  useEffect(() => {
    syncThemeClass(theme);
  }, [theme]);

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
    const next = theme === "night" ? "day" : "night";
    localStorage.setItem("album-theme", next);
    syncThemeClass(next);
    window.dispatchEvent(new Event(themeEvent));
  }

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    window.setTimeout(() => window.location.reload(), 80);
  }

  return (
    <div ref={menuRef} className="relative ml-auto md:ml-0">
      <button
        type="button"
        className="group flex items-center gap-2 rounded-full border border-border bg-surface/80 p-1 pr-2 shadow-lg shadow-text-primary/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={t("user.openMenu")}
      >
        <Avatar name={initialsName} imageUrl={session.avatarUrl ?? undefined} />
        <span className="hidden max-w-[120px] truncate text-xs font-semibold text-text-primary md:block">
          {session.userId ? name : t("user.guest")}
        </span>
      </button>

      <div
        className={`fixed left-4 right-4 top-[5.25rem] z-50 max-h-[calc(100vh-6.5rem)] origin-top rounded-[1.4rem] border border-border bg-surface/95 p-3 shadow-2xl shadow-text-primary/20 backdrop-blur-xl transition duration-200 overflow-y-auto sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[min(20rem,calc(100vw-2rem))] sm:max-h-[calc(100vh-5rem)] sm:origin-top-right ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 rounded-[1rem] bg-background/75 p-3">
          <Avatar name={initialsName} imageUrl={session.avatarUrl ?? undefined} className="h-12 w-12" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{roleLabel}</p>
            {session.email ? (
              <p className="mt-1 truncate text-xs text-text-secondary">{session.email}</p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={toggleTheme}
        >
          <span className="inline-flex items-center gap-3">
            <span className="relative h-4 w-4 text-muted-accent" aria-hidden="true">
              <Sun className="absolute inset-0 h-4 w-4 theme-sun-icon" />
              <Moon className="absolute inset-0 h-4 w-4 theme-moon-icon" />
            </span>
            {t("user.theme")}
          </span>
          <span className="relative h-6 w-11 rounded-full border border-border bg-background">
            <span className="theme-toggle-knob absolute left-1 top-1 h-4 w-4 rounded-full bg-accent transition" />
          </span>
        </button>

        <label className="mt-1 grid gap-2 rounded-[1rem] px-3 py-3 text-sm font-medium text-text-primary transition hover:bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="inline-flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-3">
              <Globe2 className="h-4 w-4 text-muted-accent" aria-hidden="true" />
              {t("user.language")}
            </span>
            <span className="max-w-[9rem] truncate text-xs font-semibold text-text-secondary">
              {localeMeta[locale].nativeName}
            </span>
          </span>
          <select
            value={locale}
            onChange={(event) => changeLocale(event.target.value as Locale)}
            aria-label={t("user.chooseLanguage")}
            className="h-11 w-full rounded-full border border-border bg-background/80 px-4 text-sm text-text-primary outline-none"
          >
            {supportedLocales.map((item) => (
              <option key={item} value={item}>
                {localeMeta[item].nativeName}
              </option>
            ))}
          </select>
        </label>

        {session.userId ? (
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 text-muted-accent" aria-hidden="true" />
            {t("user.logout")}
          </button>
        ) : (
          <Link
            href="/login"
            className="mt-1 flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogIn className="h-4 w-4 text-muted-accent" aria-hidden="true" />
            {t("user.loginGoogle")}
          </Link>
        )}

        <div className="mt-2 flex items-center gap-2 rounded-[1rem] border border-border px-3 py-2 text-xs text-text-secondary">
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          {t("user.googleOnly")}
        </div>
      </div>
    </div>
  );
}
