"use client";

import { Menu, Search } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { Input } from "@/components/ui/Input";
import { StudioBreadcrumbs } from "@/components/studio/StudioBreadcrumbs";
import { useI18n } from "@/lib/i18n-client";
import type { PublicSession } from "@/lib/types";

interface StudioTopbarProps {
  session: PublicSession;
  onOpenMobileNav: () => void;
}

export function StudioTopbar({ session, onOpenMobileNav }: StudioTopbarProps) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/82 backdrop-blur-xl">
      <div className="flex min-h-16 min-w-0 items-center gap-2 px-3 sm:min-h-20 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          onClick={onOpenMobileNav}
          aria-label={t("studioNav.openMenu")}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="hidden min-w-0 flex-1 lg:block">
          <StudioBreadcrumbs />
        </div>
        <form action="/studio/albums" className="relative ml-auto hidden w-full max-w-md md:block lg:ml-0">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <Input name="q" placeholder={t("nav.searchAlbums")} aria-label={t("nav.searchAlbums")} className="pl-11" />
        </form>
        <UserMenu session={session} />
      </div>
    </header>
  );
}
