"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import type { LandingFacebookFeedSettings } from "@/lib/types";
import type { FacebookFeedItem } from "@/lib/facebook-feed/types";
import { buildFacebookEmbedUrl } from "@/lib/facebook-feed/url";
import { isHorizontalStorySwipe, nextStoryIndex, previousStoryIndex, storyProgress, storyViewedStorageKey } from "@/lib/facebook-feed/story";

function titleFor(item: FacebookFeedItem, settings: LandingFacebookFeedSettings) {
  return settings.itemOverrides?.[item.id]?.title || item.title || "Recent motion";
}

function dateFor(item: FacebookFeedItem) {
  if (!item.published_at) return item.embed_kind === "reel" ? "Reel" : item.embed_kind === "video" ? "Video" : "Post";
  const date = new Date(item.published_at);
  return Number.isNaN(date.getTime()) ? item.embed_kind : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function focusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], video[controls], iframe, [tabindex]:not([tabindex='-1'])")).filter((element) => !element.hasAttribute("disabled"));
}

export function FacebookStoryFeed({ settings, items }: { settings: LandingFacebookFeedSettings; items: FacebookFeedItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [viewed, setViewed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(storyViewedStorageKey) ?? "[]"); } catch { return []; }
  });
  const [scrollable, setScrollable] = useState(false);
  const trayRef = useRef<HTMLDivElement>(null);
  const openers = useRef(new Map<string, HTMLButtonElement>());
  const activeItem = activeIndex === null ? null : items[activeIndex];
  const featuredId = settings.featuredItemId && items.some((item) => item.id === settings.featuredItemId) ? settings.featuredItemId : items[0]?.id;

  useEffect(() => {
    const tray = trayRef.current;
    if (!tray) return;
    const update = () => setScrollable(tray.scrollWidth > tray.clientWidth + 8);
    update();
    const observer = new ResizeObserver(update); observer.observe(tray);
    return () => observer.disconnect();
  }, [items.length]);

  const viewedSet = useMemo(() => new Set(viewed), [viewed]);
  function openStory(index: number) {
    const item = items[index]; if (!item) return;
    setActiveIndex(index);
    setViewed((current) => {
      const next = current.includes(item.id) ? current : [...current, item.id];
      try { localStorage.setItem(storyViewedStorageKey, JSON.stringify(next)); } catch { /* local-only enhancement */ }
      return next;
    });
  }
  function moveTray(direction: number) { trayRef.current?.scrollBy({ left: direction * Math.min(trayRef.current.clientWidth * 0.76, 420), behavior: "smooth" }); }

  return <section aria-labelledby="recent-motion-heading" data-testid="facebook-story-tray" className="relative mx-auto w-full max-w-[1200px] px-6 py-24 sm:py-32">
    <div className="mb-10 flex items-end justify-between gap-6 sm:mb-12"><div className="max-w-2xl"><p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-text-secondary">{settings.eyebrow}</p><h2 id="recent-motion-heading" className="mt-4 font-serif text-4xl leading-none tracking-[-0.03em] text-text-primary sm:text-5xl lg:text-[4rem]">{settings.heading}</h2>{settings.description ? <p className="mt-5 max-w-xl text-base leading-7 text-text-secondary">{settings.description}</p> : null}</div>
      {scrollable ? <div className="hidden shrink-0 items-center gap-2 md:flex"><button type="button" onClick={() => moveTray(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-surface-secondary text-text-primary transition-colors hover:bg-surface" aria-label="Previous stories"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => moveTray(1)} className="grid h-10 w-10 place-items-center rounded-full bg-surface-secondary text-text-primary transition-colors hover:bg-surface" aria-label="Next stories"><ChevronRight className="h-4 w-4" /></button></div> : null}
    </div>
    <div ref={trayRef} onWheel={(event) => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && trayRef.current) { trayRef.current.scrollLeft += event.deltaY; event.preventDefault(); } }} className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5">
      {items.map((item, index) => { const featured = item.id === featuredId; const seen = viewedSet.has(item.id); const title = titleFor(item, settings); return <article key={item.id} className={`group relative shrink-0 snap-start ${featured ? "w-[min(72vw,12rem)] sm:w-[12rem]" : "w-[min(61vw,10rem)] sm:w-[9.5rem]"}`}>
        <button ref={(node) => { if (node) openers.current.set(item.id, node); else openers.current.delete(item.id); }} type="button" onClick={() => openStory(index)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4" aria-label={`Open story: ${title}`}>
          <span className={`mb-3 grid w-fit rounded-full p-[2px] ${seen ? "bg-border" : "bg-gradient-to-br from-[#a87664] via-[#c9a875] to-[#776b99]"}`}><span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-surface-secondary"><img src={item.poster_url} alt="" className="h-full w-full object-cover" loading="lazy" /></span></span>
          <span className="relative block aspect-[9/16] overflow-hidden rounded-[1.15rem] bg-surface-secondary shadow-[0_20px_38px_rgba(38,31,27,0.08)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_26px_42px_rgba(38,31,27,0.14)] motion-reduce:transition-none"><img src={item.poster_url} alt={item.poster_alt || title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035] motion-reduce:transition-none" loading="lazy" /><span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" /><span className="absolute inset-x-0 bottom-0 block p-3 text-background"><span className="block line-clamp-2 font-serif text-lg leading-[1.05]">{title}</span><span className="mt-2 block text-[0.62rem] font-medium uppercase tracking-[0.13em] text-background/75">{dateFor(item)}</span></span></span>
        </button>
      </article>; })}
    </div>
    {activeItem !== null && activeIndex !== null ? <FacebookStoryViewer key={activeItem.id} items={items} settings={settings} index={activeIndex} onIndexChange={openStory} onClose={() => { const opener = openers.current.get(activeItem.id); setActiveIndex(null); requestAnimationFrame(() => opener?.focus()); }} /> : null}
  </section>;
}

function FacebookStoryViewer({ items, settings, index, onIndexChange, onClose }: { items: FacebookFeedItem[]; settings: LandingFacebookFeedSettings; index: number; onIndexChange: (index: number) => void; onClose: () => void }) {
  const item = items[index]; const native = item.playback_mode === "native" && Boolean(item.video_url); const title = titleFor(item, settings);
  const dialogRef = useRef<HTMLDivElement>(null); const videoRef = useRef<HTMLVideoElement>(null); const pointerRef = useRef<{ x: number; y: number } | null>(null); const progressRef = useRef(0); const shouldResumeRef = useRef(true);
  const [progress, setProgress] = useState(0); const [paused, setPaused] = useState(false); const [muted, setMuted] = useState(true); const [failed, setFailed] = useState(false);
  const goNext = useCallback(() => onIndexChange(nextStoryIndex(index, items.length)), [index, items.length, onIndexChange]); const goPrevious = useCallback(() => onIndexChange(previousStoryIndex(index, items.length)), [index, items.length, onIndexChange]);
  const updateProgress = useCallback((value: number) => { progressRef.current = value; setProgress(value); }, []);
  const pause = useCallback(() => { shouldResumeRef.current = false; const video = videoRef.current; if (video) video.pause(); setPaused(true); }, []);
  const resume = useCallback(() => { shouldResumeRef.current = true; const video = videoRef.current; if (native && video) void video.play().catch(() => setPaused(true)); setPaused(false); }, [native]);
  const togglePause = useCallback(() => { if (paused) resume(); else pause(); }, [pause, paused, resume]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; dialogRef.current?.focus();
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } else if (event.key === "ArrowRight") { event.preventDefault(); goNext(); } else if (event.key === "ArrowLeft") { event.preventDefault(); goPrevious(); } else if (event.key === " ") { event.preventDefault(); togglePause(); } else if (event.key === "Tab") { const root = dialogRef.current; if (!root) return; const elements = focusable(root); const current = elements.indexOf(document.activeElement as HTMLElement); const next = event.shiftKey ? current <= 0 ? elements.length - 1 : current - 1 : current === -1 || current === elements.length - 1 ? 0 : current + 1; event.preventDefault(); elements[next]?.focus(); } };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener("keydown", keydown); document.addEventListener("visibilitychange", visibility);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", keydown); document.removeEventListener("visibilitychange", visibility); };
  }, [goNext, goPrevious, item.id, onClose, pause, togglePause]);
  function holdStart(event: ReactPointerEvent) { pointerRef.current = { x: event.clientX, y: event.clientY }; pause(); }
  function holdEnd(event: ReactPointerEvent) { const start = pointerRef.current; pointerRef.current = null; if (start && isHorizontalStorySwipe(start.x, event.clientX, start.y, event.clientY)) { if (event.clientX < start.x) goNext(); else goPrevious(); return; } resume(); }
  const source = item.canonical_url; const embedUrl = buildFacebookEmbedUrl(source, item.embed_kind);
  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${title} story`} tabIndex={-1} data-testid="facebook-video-dialog" className="fixed inset-0 z-[100] grid bg-[rgba(15,13,13,0.96)] p-3 text-background backdrop-blur-xl sm:p-6">
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-col">
      <div className="flex gap-1 pb-3" aria-label={`Story ${index + 1} of ${items.length}`}>{items.map((story, storyIndex) => <span key={story.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full bg-white transition-[width] duration-100" style={{ width: `${storyIndex < index ? 100 : storyIndex === index ? progress * 100 : 0}%` }} /></span>)}</div>
      <header className="flex items-center justify-between gap-4 pb-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/25"><img src={item.poster_url} alt="" className="h-full w-full object-cover" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">Oriana Wren</p><p className="text-xs text-white/65">{dateFor(item)}</p></div></div><div className="flex items-center gap-1"><button type="button" onClick={() => { setMuted((value) => !value); if (videoRef.current) videoRef.current.muted = !muted; }} className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10" aria-label={muted ? "Unmute story" : "Mute story"}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button><button type="button" onClick={togglePause} className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10" aria-label={paused ? "Play story" : "Pause story"}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10" aria-label="Close story viewer"><X className="h-5 w-5" /></button></div></header>
      <div className="relative flex min-h-0 flex-1 items-center justify-center"><button type="button" onClick={goPrevious} className="absolute inset-y-0 left-0 z-10 w-[22%] cursor-w-resize" aria-label="Previous story" /><div onPointerDown={holdStart} onPointerUp={holdEnd} onPointerCancel={resume} className="relative flex h-full max-h-[calc(100dvh-10rem)] w-full max-w-[min(100%,44rem)] items-center justify-center overflow-hidden rounded-2xl bg-black/40">{native ? failed ? <div className="grid h-full place-items-center p-8 text-center text-sm text-white/70">The original video could not play here. Its Facebook source remains available below.</div> : <video ref={videoRef} data-testid="native-video-player" className="h-full max-h-[calc(100dvh-10rem)] w-full object-contain" controls playsInline preload="metadata" poster={item.poster_url} muted={muted} autoPlay onTimeUpdate={(event) => updateProgress(storyProgress(event.currentTarget.currentTime, event.currentTarget.duration))} onWaiting={() => setPaused(true)} onCanPlay={() => { if (shouldResumeRef.current) resume(); }} onEnded={goNext} onPause={() => setPaused(true)} onPlay={() => setPaused(false)} onError={() => setFailed(true)}><source src={item.video_url!} type={item.video_mime_type || "video/mp4"} /></video> : <iframe title={title} src={embedUrl} className="h-full w-full border-0" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="origin" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />}</div><button type="button" onClick={goNext} className="absolute inset-y-0 right-0 z-10 w-[22%] cursor-e-resize" aria-label="Next story" /></div>
      <footer className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm"><p className="max-w-lg text-white/70">{settings.itemOverrides?.[item.id]?.caption || item.caption || title}</p><a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-white underline underline-offset-4">View original on Facebook <ExternalLink className="h-4 w-4" /></a></footer>
    </div>
  </div>;
}
