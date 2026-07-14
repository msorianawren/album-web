"use client";

import type { LandingMediaItem, SiteSettings } from "@/lib/types";

export function HomeMediaGallery({ items, settings }: { items: LandingMediaItem[], settings?: SiteSettings }) {
  const displayItems = [...items].filter(i => i.enabled).sort((a, b) => a.order - b.order);

  if (displayItems.length === 0) return null;

  const style = settings?.homepage_gallery_mode || "grid";

  return (
    <section className={`mx-auto w-full ${style === "carousel" ? "max-w-full pl-4 py-16 sm:pl-6 sm:py-24 md:pl-16 lg:py-32" : "max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24 lg:py-32"}`}>
      <div className="mb-12 sm:mb-16 flex flex-col items-start justify-center">
        <h2 className="font-serif text-3xl font-light text-text-primary sm:text-4xl">
          Selected Works
        </h2>
      </div>

      <div className={
        style === "masonry" 
          ? "columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6" 
          : style === "carousel"
            ? "flex overflow-x-auto gap-4 sm:gap-6 pb-8 snap-x snap-mandatory pr-4 sm:pr-6"
            : "grid gap-6 sm:gap-8 sm:grid-cols-2 md:grid-cols-3"
      }>
        {displayItems.map((item) => (
          <div 
            key={item.id} 
            className={`group relative overflow-hidden rounded-[1.2rem] border border-border/40 bg-surface-secondary/30 break-inside-avoid ${
              style === "carousel" ? "min-w-[280px] md:min-w-[340px] snap-center shrink-0" : ""
            }`}
          >
            <div className={`w-full overflow-hidden ${style === "masonry" ? "h-auto" : "aspect-[3/4]"}`}>
              {item.type === "video" ? (
                <video
                  src={item.url}
                  poster={item.poster_url || undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={item.alt || ""}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              )}
            </div>
            {(item.title || item.caption) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent p-6 pt-12 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                {item.title && <h3 className="font-serif text-lg text-text-primary mb-1">{item.title}</h3>}
                {item.caption && <p className="text-[0.8rem] leading-[1.6] text-text-secondary/80 font-light">{item.caption}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
