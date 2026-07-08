"use client";

import Link from "next/link";
import { useState } from "react";
import { LogIn, Menu, Search, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PublicSession } from "@/lib/types";

interface PublicMobileNavProps {
  session: PublicSession;
  navItems: Array<{ href: string; label: string }>;
}

export function PublicMobileNav({ session, navItems }: PublicMobileNavProps) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface/80 text-text-primary shadow-lg shadow-text-primary/5 transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-overlay backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={close}
        />
        <div
          className={`absolute bottom-0 right-0 top-0 flex w-[min(23rem,100vw)] flex-col overflow-y-auto border-l border-border bg-surface p-4 shadow-2xl shadow-text-primary/20 transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold uppercase tracking-[0.22em] text-text-primary">
                Oriana Wren
              </p>
              <p className="mt-1 truncate text-xs uppercase tracking-[0.24em] text-text-secondary">
                Navigation
              </p>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={close}
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form action="/albums" className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <input
              name="q"
              placeholder="Search albums"
              className="h-12 w-full rounded-full border border-border bg-background/75 pl-11 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-secondary focus:ring-2 focus:ring-ring"
            />
          </form>

          <nav className="mt-5 grid gap-1" aria-label="Mobile primary navigation">
            {navItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={close}
                className="flex min-h-12 items-center rounded-[1rem] px-3 text-base font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto grid gap-2 pt-6">
            {session.isAdmin ? (
              <Link href="/studio" onClick={close}>
                <Button className="w-full">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  Studio
                </Button>
              </Link>
            ) : session.userId ? (
              <div className="rounded-[1rem] border border-border bg-background/70 px-4 py-3 text-sm text-text-secondary">
                Signed in as <span className="font-semibold text-text-primary">{session.email}</span>
              </div>
            ) : (
              <Link href="/login" onClick={close}>
                <Button variant="secondary" className="w-full">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
