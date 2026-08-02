"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { LandingAdminStoriesSettings, PublicAdminStory } from "@/lib/types";
import { StoryPlayer } from "@/components/landing/StoryPlayer";
import { SakuraCorner, SakuraCrest } from "./NatureOrnament";

function formatDuration(value: number | null) {
  if (!value || !Number.isFinite(value)) return null;
  const total = Math.max(0, Math.round(value));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function HomeAdminStories({ settings, items }: { settings: LandingAdminStoriesSettings; items: PublicAdminStory[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const storyButtonRefs = useRef(new Map<string, HTMLButtonElement>());
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

  const scroll = (direction: -1 | 1) => {
    const rail = railRef.current;
    rail?.scrollBy({ left: direction * Math.max(240, rail.clientWidth * 0.72), behavior: "smooth" });
  };

  const keepCurrentStoryInView = useCallback((index: number) => {
    const rail = railRef.current;
    const item = items[index];
    const button = item ? storyButtonRefs.current.get(item.id) : null;
    if (!rail || !button) return;
    const left = button.offsetLeft - (rail.clientWidth - button.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [items]);

  const getStoryButton = useCallback((index: number) => {
    const item = items[index];
    return item ? storyButtonRefs.current.get(item.id) ?? null : null;
  }, [items]);

  const closeStory = useCallback((index: number) => {
    setSelectedIndex(null);
    window.requestAnimationFrame(() => getStoryButton(index)?.focus({ preventScroll: true }));
  }, [getStoryButton]);

  if (items.length === 0) return null;

  return (
    <section className="lcb-stories relative overflow-hidden" aria-labelledby="founder-stories-heading">
      <SakuraCorner position="top-right" />
      <div className="lcb-stories__heading">
        <div>
          <p className="flex items-center gap-2">
            <span>{settings.eyebrow}</span>
            <SakuraCrest className="h-3 w-3 opacity-75" />
          </p>
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
              <button
                ref={(node) => {
                  if (node) storyButtonRefs.current.set(item.id, node);
                  else storyButtonRefs.current.delete(item.id);
                }}
                type="button"
                data-story-id={item.id}
                onClick={() => setSelectedIndex(index)}
                aria-label={`Play story${item.caption ? `: ${item.caption}` : ""}`}
              >
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

      {selectedIndex !== null ? (
        <StoryPlayer
          items={items}
          initialIndex={selectedIndex}
          onClose={closeStory}
          onIndexChange={keepCurrentStoryInView}
          getReturnTarget={getStoryButton}
        />
      ) : null}
    </section>
  );
}
