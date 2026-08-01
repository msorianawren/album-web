"use client";

import { useRef, useState, useEffect } from "react";
import type { AdminStory, LandingAdminStoriesSettings } from "@/lib/types";
import { StoryPlayer } from "@/components/landing/StoryPlayer";
import { Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function HomeAdminStories({
  settings,
  items,
}: {
  settings: LandingAdminStoriesSettings;
  items: AdminStory[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className="relative z-10 mx-auto max-w-[1600px] overflow-hidden px-6 py-24 sm:px-12 md:py-32 xl:px-24">
      <div className="mb-12 md:mb-16">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {settings.eyebrow}
        </h2>
        <h3 className="font-serif text-3xl text-text-primary md:text-5xl">
          {settings.heading}
        </h3>
      </div>

      <div
        ref={scrollRef}
        className="hide-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-8 sm:-mx-12 sm:px-12 xl:-mx-24 xl:gap-6 xl:px-24"
      >
        {items.map((item, index) => {
          const isHovered = hoveredId === item.id;
          
          return (
            <div
              key={item.id}
              className="group relative h-[400px] w-[225px] shrink-0 snap-start overflow-hidden rounded-[1.5rem] bg-surface/50 shadow-lg transition-transform hover:scale-[1.02] sm:h-[500px] sm:w-[281px] cursor-pointer ring-1 ring-border"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedIndex(index)}
            >
              {/* Thumbnail */}
              {item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt={item.caption || "Story thumbnail"}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                    isHovered ? "opacity-0" : "opacity-100"
                  }`}
                />
              )}
              
              {/* Video Preview on Hover */}
              {isHovered && (
                <video
                  src={item.video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/90 text-accent-foreground shadow-lg backdrop-blur-md">
                    <Play className="ml-1 h-4 w-4" fill="currentColor" />
                  </div>
                  {item.caption && (
                    <p className="line-clamp-2 text-sm font-medium text-white drop-shadow-md">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <StoryPlayer
            items={items}
            initialIndex={selectedIndex}
            onClose={() => setSelectedIndex(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
