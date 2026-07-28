"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { buildFacebookEmbedUrl } from "@/lib/facebook-feed/url";
import type { FacebookFeedItem } from "@/lib/facebook-feed/types";

export function FacebookVideoPlayer({ item, label }: { item: FacebookFeedItem; label: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current; closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); opener?.focus(); };
  }, [open]);
  const embedUrl = buildFacebookEmbedUrl(item.canonical_url, item.embed_kind);
  return <>
    <button ref={openerRef} type="button" onClick={() => setOpen(true)} className="absolute inset-0 z-10 grid place-items-center" aria-label={`Play ${label}`}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-background/88 text-text-primary shadow-lg transition-transform duration-200 hover:scale-105 motion-reduce:transition-none"><Play className="ml-0.5 h-4 w-4 fill-current" /></span>
    </button>
    {open ? <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[100] grid place-items-center bg-lightbox/95 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[1.25rem] bg-surface shadow-2xl">
        <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/90 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close video player"><X className="h-5 w-5" /></button>
        <iframe title={label} src={embedUrl} className="aspect-video w-full bg-surface-secondary" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="origin" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        <div className="flex justify-center p-4"><a href={item.canonical_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-text-primary underline underline-offset-4">View on Facebook <ExternalLink className="h-4 w-4" /></a></div>
      </div>
    </div> : null}
  </>;
}
