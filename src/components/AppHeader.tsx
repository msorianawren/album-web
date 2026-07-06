import Link from "next/link";
import { Camera, Search, Shield } from "lucide-react";
import { getPublicSession } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";

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
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 w-full max-w-[1440px] items-center gap-4 px-4 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 rounded-xl text-lg font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Camera className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>Album Web</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            placeholder="Search albums"
            className="pl-11"
          />
        </form>

        {session.isAdmin ? (
          <Link
            href="/studio"
            className="hidden h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-accent-foreground transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:inline-flex"
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
            Studio
          </Link>
        ) : (
          <Link
            href="/login"
            className="hidden h-11 items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-medium text-text-primary transition hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            Login
          </Link>
        )}
        <Avatar name={session.isAdmin ? "Admin" : "Guest"} />
      </div>
    </header>
  );
}
