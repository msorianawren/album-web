"use client";

import type { Album } from "@/lib/types";
import type { AppDictionary } from "@/lib/i18n";

export function AlbumAccessRequestButton({ album, dict }: { album: Album; dict?: AppDictionary }) {
  return (
    <button 
      className="inline-flex items-center justify-center gap-2 border-b border-text-primary/40 pb-1 text-[0.7rem] font-semibold uppercase tracking-widest text-text-primary transition-colors hover:text-accent hover:border-accent"
      onClick={(e) => {
        e.preventDefault();
        // We will dispatch a custom event to open the request modal
        document.dispatchEvent(new CustomEvent("open-access-request", { detail: album }));
      }}
    >
      {dict?.albums?.request_access || "Request private access"}
    </button>
  );
}
