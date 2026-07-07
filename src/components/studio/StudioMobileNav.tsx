"use client";

import { X } from "lucide-react";
import { StudioSidebar } from "@/components/studio/StudioSidebar";

interface StudioMobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function StudioMobileNav({ open, onClose }: StudioMobileNavProps) {
  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-overlay backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 top-0 w-[min(22rem,calc(100vw-2rem))] p-3 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-text-primary"
          onClick={onClose}
          aria-label="Close Studio menu"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <StudioSidebar onNavigate={onClose} />
      </div>
    </div>
  );
}
