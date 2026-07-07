import Link from "next/link";
import { Search, Shield } from "lucide-react";
import { getPublicSession } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { UserMenu } from "@/components/UserMenu";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/#albums", label: "Albums" },
  { href: "/#explore", label: "Explore" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact Us" },
];

export async function AppHeader() {
  const session = await getPublicSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 w-full max-w-[1440px] items-center gap-4 px-4 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex shrink-0 flex-col rounded-xl text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-lg font-semibold uppercase tracking-[0.22em]">
            Oriana Wren
          </span>
          <span className="text-[0.64rem] uppercase tracking-[0.3em] text-text-secondary">
            Professional Model
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface/70 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action="/api/search" className="relative ml-auto hidden w-full max-w-sm md:block">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            name="q"
            aria-label="Search albums"
            placeholder="Search portfolio"
            className="pl-11"
          />
        </form>

        {session.isAdmin ? (
          <Link
            href="/studio"
            className="hidden h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-foreground transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:inline-flex"
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
            Studio
          </Link>
        ) : session.userId ? (
          <span className="hidden h-11 items-center justify-center rounded-full border border-border bg-surface/70 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-text-primary sm:inline-flex">
            Signed in
          </span>
        ) : (
          <Link
            href="/login"
            className="hidden h-11 items-center justify-center rounded-full border border-border bg-surface/70 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-text-primary transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            Login
          </Link>
        )}
        <UserMenu session={session} />
      </div>
    </header>
  );
}
