"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, LoaderCircle, Play, X } from "lucide-react";
import { buildFacebookEmbedUrl } from "@/lib/facebook-feed/url";
import type { FacebookFeedItem } from "@/lib/facebook-feed/types";
import { resolveFacebookPlayerFrame } from "@/lib/facebook-feed/player";

function focusableIn(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], iframe, [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hasAttribute("hidden") && element.offsetParent !== null);
}

export function FacebookVideoPlayer({ item, label }: { item: FacebookFeedItem; label: string }) {
  const [open, setOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const restoreOverflow = useRef<{ overflow: string; paddingRight: string } | null>(null);
  const embedUrl = useMemo(() => buildFacebookEmbedUrl(item.canonical_url, item.embed_kind), [item.canonical_url, item.embed_kind]);

  function openPlayer() {
    setIframeLoaded(false);
    setTimedOut(false);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : openerRef.current;
    restoreOverflow.current = { overflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    const timeout = window.setTimeout(() => setTimedOut(true), 8_000);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current; if (!dialog) return;
      const focusable = focusableIn(dialog);
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame); window.clearTimeout(timeout); document.removeEventListener("keydown", onKeyDown);
      if (restoreOverflow.current) { document.body.style.overflow = restoreOverflow.current.overflow; document.body.style.paddingRight = restoreOverflow.current.paddingRight; }
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open]);

  return <>
    <button ref={openerRef} type="button" onClick={openPlayer} className="absolute inset-0 z-10 grid place-items-center" aria-label={`Play ${label}`}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-background/88 text-text-primary shadow-lg transition-transform duration-200 hover:scale-105 motion-reduce:transition-none"><Play className="ml-0.5 h-4 w-4 fill-current" /></span>
    </button>
    {open ? <div className="fixed inset-0 z-[100] grid place-items-center bg-lightbox/95 p-4 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={label} aria-describedby="facebook-player-fallback" tabIndex={-1} className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col items-center overflow-auto rounded-[1.25rem] bg-surface p-4 shadow-2xl sm:p-5" onMouseDown={(event) => event.stopPropagation()}>
        <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/90 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close video player"><X className="h-5 w-5" /></button>
        <div className="relative mt-7 max-h-[70dvh] overflow-hidden rounded-xl bg-surface-secondary" style={resolveFacebookPlayerFrame(item)}>
          {!iframeLoaded && !timedOut ? <div className="absolute inset-0 z-10 grid place-items-center gap-3 bg-surface-secondary text-sm text-text-secondary"><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span>Loading Facebook player…</span></div> : null}
          <iframe title={label} src={embedUrl} className="h-full w-full border-0 bg-surface-secondary" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="origin" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen onLoad={() => setIframeLoaded(true)} />
          {timedOut && !iframeLoaded ? <div className="absolute inset-x-3 bottom-3 z-10 rounded-lg bg-surface/95 p-3 text-center text-sm text-text-secondary shadow-lg">Facebook may be blocked here. Use the link below to watch on Facebook.</div> : null}
        </div>
        <a id="facebook-player-fallback" href={item.canonical_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-text-primary underline underline-offset-4">View on Facebook <ExternalLink className="h-4 w-4" /></a>
      </div>
    </div> : null}
  </>;
}
