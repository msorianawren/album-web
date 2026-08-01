"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { LandingAdminStoriesSettings, PublicAdminStory } from "@/lib/types";
import { StoryPlayer } from "@/components/landing/StoryPlayer";

export function HomeAdminStories({ settings, items }: { settings: LandingAdminStoriesSettings; items: PublicAdminStory[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [scrollState, setScrollState] = useState({ previous: false, next: false });

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setScrollState({ previous: rail.scrollLeft > 4, next: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (railRef.current) observer.observe(railRef.current);
    return () => observer.disconnect();
  }, [items.length, measure]);

  if (items.length === 0) return null;
  const scroll = (direction: -1 | 1) => railRef.current?.scrollBy({ left: direction * Math.max(260, railRef.current.clientWidth * 0.72), behavior: "smooth" });

  return (
    <section aria-labelledby="founder-stories-heading" className="relative z-10 mx-auto max-w-[1600px] overflow-hidden px-6 py-20 sm:px-12 md:py-28 xl:px-24">
      <div className="mb-10 flex items-end justify-between gap-6 md:mb-14">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">{settings.eyebrow}</p>
          <h2 id="founder-stories-heading" className="font-serif text-3xl text-text-primary md:text-5xl">{settings.heading}</h2>
        </div>
        {(scrollState.previous || scrollState.next) && (
          <div className="hidden gap-2 md:flex" aria-label="Founder Stories carousel controls">
            <button type="button" aria-label="Previous stories" disabled={!scrollState.previous} onClick={() => scroll(-1)} className="grid size-11 place-items-center rounded-full border border-border bg-background/70 text-text-primary transition hover:border-accent disabled:opacity-30"><ChevronLeft className="size-5" /></button>
            <button type="button" aria-label="Next stories" disabled={!scrollState.next} onClick={() => scroll(1)} className="grid size-11 place-items-center rounded-full border border-border bg-background/70 text-text-primary transition hover:border-accent disabled:opacity-30"><ChevronRight className="size-5" /></button>
          </div>
        )}
      </div>
      <div ref={railRef} onScroll={measure} className="hide-scrollbar -mx-6 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-6 pb-4 sm:-mx-12 sm:px-12 lg:gap-6 xl:-mx-24 xl:px-24">
        {items.map((item, index) => (
          <button key={item.id} type="button" onClick={() => setSelectedIndex(index)} aria-label={`Play story${item.caption ? `: ${item.caption}` : ""}`} className="group relative aspect-[9/16] w-[11.25rem] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-900 text-left shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:w-[13.5rem] lg:w-[15rem]">
            <Image src={item.poster_url} alt="" fill sizes="(min-width: 1024px) 240px, (min-width: 640px) 216px, 180px" unoptimized className="object-cover transition duration-500 group-hover:scale-[1.025]" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 sm:p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-zinc-950 shadow-lg transition group-hover:scale-105"><Play className="ml-0.5 size-4" fill="currentColor" /></span>
              {item.caption ? <span className="line-clamp-2 text-sm font-medium leading-snug text-white">{item.caption}</span> : null}
            </span>
          </button>
        ))}
      </div>
      {selectedIndex !== null ? <StoryPlayer items={items} initialIndex={selectedIndex} onClose={() => setSelectedIndex(null)} /> : null}
    </section>
  );
}
