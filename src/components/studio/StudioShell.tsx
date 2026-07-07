"use client";

import { useState, type ReactNode } from "react";
import { StudioMobileNav } from "@/components/studio/StudioMobileNav";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { StudioTopbar } from "@/components/studio/StudioTopbar";
import type { PublicSession } from "@/lib/types";

interface StudioShellProps {
  session: PublicSession;
  children: ReactNode;
}

export function StudioShell({ session, children }: StudioShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <StudioMobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="mx-auto grid min-h-screen w-full max-w-[1680px] lg:grid-cols-[300px_1fr]">
        <div className="sticky top-0 hidden h-screen p-4 lg:block">
          <StudioSidebar />
        </div>
        <div className="min-w-0">
          <StudioTopbar session={session} onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="min-w-0 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
