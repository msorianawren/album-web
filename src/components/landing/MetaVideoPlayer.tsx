"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import type { MetaFeedItem } from "@/lib/meta/types";

export function MetaVideoPlayer({ item, playMode, label }: { item: MetaFeedItem; playMode: "inline" | "facebook"; label: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const focusable = document.querySelectorAll<HTMLElement>("[data-meta-player-dialog] button, [data-meta-player-dialog] a, [data-meta-player-dialog] iframe");
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); opener?.focus(); };
  }, [open]);

  if (playMode === "facebook") {
    return <a href={item.permalink_url} target="_blank" rel="noreferrer" className="absolute inset-0 z-10 grid place-items-center" aria-label={`Open ${label} on Facebook`}><span className="grid h-12 w-12 place-items-center rounded-full bg-background/88 text-text-primary shadow-lg"><ExternalLink className="h-4 w-4" /></span></a>;
  }

  return <>
    <button ref={openerRef} type="button" onClick={() => setOpen(true)} className="absolute inset-0 z-10 grid place-items-center" aria-label={`Play ${label}`}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-background/88 text-text-primary shadow-lg transition-transform duration-200 hover:scale-105 motion-reduce:transition-none"><Play className="ml-0.5 h-4 w-4 fill-current" /></span>
    </button>
    {open ? <div data-meta-player-dialog role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[100] grid place-items-center bg-lightbox/95 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[1.25rem] bg-surface shadow-2xl">
        <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/90 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close video player"><X className="h-5 w-5" /></button>
        {item.embed_url ? <iframe title={label} src={item.embed_url} className="aspect-video w-full bg-surface-secondary" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen /> : <div className="grid aspect-video place-items-center gap-4 p-8 text-center"><p className="text-text-secondary">Facebook could not load this video here.</p><a href={item.permalink_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-text-primary underline underline-offset-4">Open on Facebook <ExternalLink className="h-4 w-4" /></a></div>}
      </div>
    </div> : null}
  </>;
}
