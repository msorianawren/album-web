import Link from "next/link";
import { Search, Shield } from "lucide-react";
import { getPublicSession } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { PublicMobileNav } from "@/components/PublicMobileNav";
import { UserMenu } from "@/components/UserMenu";
import { getSiteSettings } from "@/lib/site-settings";



import { cookies } from "next/headers";
import { getDictionary } from "@/lib/getDictionary";

export async function AppHeader() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as "en" | "vi") || "en";
  const dict = await getDictionary(locale);

  const [session, settings] = await Promise.all([
    getPublicSession(),
    getSiteSettings(),
  ]);

  const navItems = [
    { href: "/", label: dict.nav.home || "Home" },
    { href: "/albums", label: dict.nav.albums },
    { href: "/about", label: dict.nav.about },
    { href: "/contact", label: dict.nav.contact || "Contact Us" },
  ];
  const mobileItems = navItems.filter((item) => item.label !== dict.nav.explore);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center gap-2 px-3 sm:min-h-20 sm:gap-4 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex min-w-0 shrink flex-col justify-center rounded-xl text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:shrink-0"
        >
          {settings.site_logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={settings.site_logo_url} 
              alt={settings.site_logo_alt ?? settings.site_name} 
              className="h-8 w-auto object-contain sm:h-10" 
            />
          ) : (
            <>
              <span className="truncate text-sm font-semibold uppercase tracking-[0.18em] sm:text-lg sm:tracking-[0.22em]">
                {settings.site_name || "Oriana Wren"}
              </span>
              <span className="truncate text-[0.56rem] uppercase tracking-[0.22em] text-text-secondary sm:text-[0.64rem] sm:tracking-[0.3em]">
                {settings.site_description || "Professional Model"}
              </span>
            </>
          )}
        </Link>

        <nav className="ml-4 hidden items-center gap-1 xl:flex shrink-0" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-text-secondary transition whitespace-nowrap hover:bg-surface/70 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action="/albums" className="relative ml-auto hidden w-full max-w-sm shrink lg:block">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            name="q"
            aria-label="Search albums"
            placeholder="Search portfolio"
            className="pl-11 min-w-[140px]"
          />
        </form>

        <div className="ml-auto lg:ml-4 flex items-center shrink-0 gap-2">
          {session.isAdmin ? (
            <Link
              href="/studio"
              className="hidden h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-accent text-xs font-semibold uppercase tracking-[0.16em] text-accent-foreground transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:flex lg:h-11 lg:w-auto lg:px-5"
              aria-label={dict.nav.studio}
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline whitespace-nowrap">{dict.nav.studio}</span>
            </Link>
          ) : null}
          <PublicMobileNav session={session} navItems={navItems} />
          <UserMenu session={session} dict={dict} />
        </div>
      </div>
      <nav
        className="mx-auto flex w-full max-w-[1440px] gap-2 overflow-x-auto border-t border-border/70 px-3 py-2 sm:px-8 lg:hidden snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
        aria-label="Mobile quick navigation"
      >
        {mobileItems.map((item) => (
          <Link
            key={`mobile-${item.href}-${item.label}`}
            href={item.href}
            className="snap-start flex h-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface/82 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-text-primary shadow-sm shadow-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.label}
          </Link>
        ))}
        {session.isAdmin ? (
          <Link
            href="/studio"
            className="snap-start flex h-10 shrink-0 items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold uppercase tracking-[0.12em] text-accent-foreground shadow-sm shadow-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dict.nav.studio}
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
