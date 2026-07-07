"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { studioNavItems, studioQuickActions } from "@/components/studio/studio-nav";
import { cn } from "@/lib/utils";

interface StudioSidebarProps {
  onNavigate?: () => void;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/studio") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudioSidebar({ onNavigate }: StudioSidebarProps) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <aside className="flex h-full flex-col overflow-y-auto rounded-[1.4rem] border border-border bg-surface/88 p-3 shadow-xl shadow-text-primary/5 backdrop-blur sm:rounded-[1.6rem] sm:p-4">
      <Link href="/studio" className="rounded-[1rem] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onNavigate}>
        <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-text-primary">
          Studio
        </span>
        <span className="mt-1 block text-xs text-text-secondary">
          Admin workspace
        </span>
      </Link>

      <nav className="mt-4 grid gap-1" aria-label="Studio navigation">
        {studioNavItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-[1rem] px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-background hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active && "bg-accent text-accent-foreground shadow-lg shadow-text-primary/10 hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 rounded-[1.2rem] border border-border bg-background/55 p-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-secondary">
          Quick actions
        </p>
        <div className="mt-3 grid gap-1">
          {studioQuickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="flex min-h-10 items-center gap-2 rounded-[0.85rem] px-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-auto grid gap-2 pt-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-3 text-center text-xs font-semibold uppercase tracking-[0.1em] text-text-primary transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:tracking-[0.14em]"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          View public site
        </Link>
        <Button variant="secondary" className="w-full" onClick={logout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
