"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import type { PublicAdminStory } from "@/lib/types";

export function StoryPlayer({ items, initialIndex, onClose }: { items: PublicAdminStory[]; initialIndex: number; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const current = items[currentIndex];

  const previous = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1));
    setProgress(0); setPlaying(true);
  }, []);
  const next = useCallback(() => {
    setCurrentIndex((index) => Math.min(items.length - 1, index + 1));
    setProgress(0); setPlaying(true);
  }, [items.length]);
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
      if (event.key === " " && event.target === dialogRef.current) { event.preventDefault(); setPlaying((value) => !value); }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), video[controls]')];
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [close, next, previous]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }, [playing, currentIndex]);

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Founder Story player" tabIndex={-1} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 backdrop-blur-lg sm:p-6">
      <button type="button" onClick={close} aria-label="Close story player" className="absolute right-3 top-3 z-20 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6 sm:top-6"><X className="size-5" /></button>
      <div style={{ height: "min(calc(100dvh - 1.5rem), calc((100vw - 1.5rem) * 16 / 9))" }} className="relative aspect-[9/16] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[1.25rem] bg-zinc-950 shadow-2xl">
        <video key={current.id} ref={videoRef} src={current.video_url} poster={current.poster_url} controls playsInline preload="metadata" autoPlay muted={muted} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(event) => setProgress(event.currentTarget.duration ? event.currentTarget.currentTime / event.currentTarget.duration : 0)} onEnded={() => currentIndex < items.length - 1 ? next() : setPlaying(false)} className="size-full object-contain" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex gap-1 p-3">
          {items.map((item, index) => <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full bg-white" style={{ width: `${index < currentIndex ? 100 : index === currentIndex ? progress * 100 : 0}%` }} /></span>)}
        </div>
        {current.caption ? <p className="pointer-events-none absolute inset-x-0 bottom-14 bg-gradient-to-t from-black/75 to-transparent px-5 pb-4 pt-14 text-sm text-white sm:text-base">{current.caption}</p> : null}
        <div className="absolute bottom-16 right-3 flex gap-2 sm:bottom-20 sm:right-4">
          <button type="button" aria-label={playing ? "Pause video" : "Play video"} onClick={() => setPlaying((value) => !value)} className="grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur">{playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}</button>
          <button type="button" aria-label={muted ? "Unmute video" : "Mute video"} onClick={() => setMuted((value) => !value)} className="grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur">{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button>
        </div>
      </div>
      <button type="button" aria-label="Previous story" disabled={currentIndex === 0} onClick={previous} className="absolute left-3 hidden size-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-20 md:grid"><ChevronLeft className="size-6" /></button>
      <button type="button" aria-label="Next story" disabled={currentIndex === items.length - 1} onClick={next} className="absolute right-3 hidden size-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-20 md:grid"><ChevronRight className="size-6" /></button>
    </div>
  );
}
