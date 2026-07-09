"use client";

import type { LandingMediaItem } from "@/lib/types";

export function HomeMediaGallery({ items }: { items: LandingMediaItem[] }) {
  const displayItems = [...items].filter(i => i.enabled).sort((a, b) => a.order - b.order);

  if (displayItems.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-24 sm:py-32">
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
        {displayItems.map((item) => (
          <div key={item.id} className="group relative overflow-hidden rounded-[1.4rem] border border-border/50 bg-surface/30">
            <div className="aspect-[3/4] w-full overflow-hidden">
              {item.type === "video" ? (
                <video
                  src={item.url}
                  poster={item.poster_url || undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.alt || ""}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
            </div>
            {(item.title || item.caption) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent p-6 pt-12 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                {item.title && <h3 className="font-serif text-lg text-text-primary">{item.title}</h3>}
                {item.caption && <p className="mt-1 text-sm text-text-secondary">{item.caption}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
