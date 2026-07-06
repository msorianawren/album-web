import Link from "next/link";
import { Camera, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center gap-4 px-4 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 rounded-xl text-lg font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Camera className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Album Web</span>
        </Link>

        <div className="relative ml-auto hidden w-full max-w-md md:block">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            aria-label="Search albums"
            placeholder="Search albums"
            className="pl-11"
          />
        </div>

        <Button className="hidden sm:inline-flex">
          Create album
        </Button>
        <Avatar name="Album Owner" />
      </div>
    </header>
  );
}
