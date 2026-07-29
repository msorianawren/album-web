"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import { buildFacebookEmbedUrl, getFacebookEmbedAspectRatio } from "@/lib/facebook-feed/url";
import type { FacebookFeedItem } from "@/lib/facebook-feed/types";

const playerTimeoutMs = 8_000;

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    "a[href], button:not([disabled]), iframe, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
  )).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
}

export function FacebookVideoPlayer({ item, label }: { item: FacebookFeedItem; label: string }) {
  const [open, setOpen] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const embedUrl = buildFacebookEmbedUrl(item.canonical_url, item.embed_kind);
  const aspectRatio = getFacebookEmbedAspectRatio(item);
  const playerStyle = {
    "--facebook-player-aspect": String(aspectRatio),
    aspectRatio: String(aspectRatio),
    width: `min(100%, calc((100dvh - 11rem) * ${aspectRatio}))`,
  } as CSSProperties;

  function closePlayer() {
    setOpen(false);
  }

  function openPlayer() {
    setTimedOut(false);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePlayer();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const current = document.activeElement as HTMLElement | null;
      const currentIndex = current ? focusable.indexOf(current) : -1;
      const next = event.shiftKey
        ? currentIndex <= 0 ? focusable[focusable.length - 1] : focusable[currentIndex - 1]
        : currentIndex === -1 || currentIndex === focusable.length - 1 ? focusable[0] : focusable[currentIndex + 1];
      event.preventDefault();
      next.focus();
    };
    const timeout = window.setTimeout(() => setTimedOut(true), playerTimeoutMs);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return <>
    <button ref={openerRef} type="button" onClick={openPlayer} className="absolute inset-0 z-10 grid place-items-center" aria-label={`Play ${label}`}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-background/88 text-text-primary shadow-lg transition-transform duration-200 hover:scale-105 motion-reduce:transition-none"><Play className="ml-0.5 h-4 w-4 fill-current" /></span>
    </button>
    {open ? <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={label} aria-describedby="facebook-player-description" tabIndex={-1} data-testid="facebook-video-dialog" className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-lightbox/95 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closePlayer(); }}>
      <div className="relative flex w-full max-w-5xl flex-col rounded-[1.25rem] bg-surface p-3 shadow-2xl sm:p-4" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-4 px-1"><p id="facebook-player-description" className="text-sm text-text-secondary">Facebook opens only after you press Play. If it cannot embed here, use the link below.</p><button ref={closeRef} type="button" onClick={closePlayer} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/90 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close video player"><X className="h-5 w-5" /></button></div>
        <div className="relative mx-auto overflow-hidden rounded-xl bg-surface-secondary" style={playerStyle} data-testid="facebook-embed-frame">
          <iframe title={label} src={embedUrl} className="absolute inset-0 h-full w-full border-0" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="origin" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
        <div className="flex flex-col items-center gap-2 p-3 text-center"><p className="text-sm text-text-secondary" role="status">{timedOut ? "Facebook did not become available here. You can still watch it on Facebook." : "Loading the Facebook embed…"}</p><a href={item.canonical_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-text-primary underline underline-offset-4">View on Facebook <ExternalLink className="h-4 w-4" /></a></div>
      </div>
    </div> : null}
  </>;
}
