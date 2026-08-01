"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { LandingAdminStoriesSettings, PublicAdminStory } from "@/lib/types";
import { StoryPlayer } from "@/components/landing/StoryPlayer";

function formatDuration(value: number | null) {
  if (!value || !Number.isFinite(value)) return null;
  const total = Math.max(0, Math.round(value));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

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

  const scroll = (direction: -1 | 1) => {
    const rail = railRef.current;
    rail?.scrollBy({ left: direction * Math.max(240, rail.clientWidth * 0.72), behavior: "smooth" });
  };

  return (
    <section className="lcb-stories" aria-labelledby="founder-stories-heading">
      <div className="lcb-stories__heading">
        <div>
          <p>{settings.eyebrow}</p>
          <h2 id="founder-stories-heading">{settings.heading}</h2>
        </div>
        <div className="lcb-stories__controls" aria-label="Founder Stories rail controls">
          <button type="button" aria-label="Previous stories" disabled={!scrollState.previous} onClick={() => scroll(-1)}><ChevronLeft aria-hidden="true" /></button>
          <button type="button" aria-label="Next stories" disabled={!scrollState.next} onClick={() => scroll(1)}><ChevronRight aria-hidden="true" /></button>
        </div>
      </div>

      <div ref={railRef} onScroll={measure} className="lcb-stories__rail">
        {items.map((item, index) => {
          const duration = formatDuration(item.duration_seconds);
          return (
            <article key={item.id} className="lcb-story">
              <button type="button" onClick={() => setSelectedIndex(index)} aria-label={`Play story${item.caption ? `: ${item.caption}` : ""}`}>
                <Image src={item.poster_url} alt="" fill sizes="(max-width: 639px) 158px, 204px" unoptimized className="object-cover" />
                <span className="lcb-story__play"><Play aria-hidden="true" fill="currentColor" /></span>
              </button>
              <div className="lcb-story__caption">
                <p>{item.caption || "Untitled film"}</p>
                {duration ? <span>{duration}</span> : null}
              </div>
            </article>
          );
        })}
      </div>

      {selectedIndex !== null ? <StoryPlayer items={items} initialIndex={selectedIndex} onClose={() => setSelectedIndex(null)} /> : null}
    </section>
  );
}
