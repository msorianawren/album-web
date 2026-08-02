"use client";

import type { Album } from "@/lib/types";
import type { AppDictionary } from "@/lib/i18n";

export function AlbumAccessRequestButton({ album, dict }: { album: Album; dict?: AppDictionary }) {
  return (
    <button 
      type="button"
      className="inline-flex items-center justify-center gap-1 border-b border-white/50 pb-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white transition-colors hover:text-accent hover:border-accent"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Dispatch a custom event to open the request modal
        document.dispatchEvent(new CustomEvent("open-access-request", { detail: album }));
      }}
    >
      {dict?.albums?.request_access || "Request access"}
    </button>
  );
}
