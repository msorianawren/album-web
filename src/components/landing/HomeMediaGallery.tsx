"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { LandingMediaItem } from "@/lib/types";

export function HomeMediaGallery({ items }: { items: LandingMediaItem[] }) {
  const displayItems = [...items].filter((item) => item.enabled && item.url.trim()).sort((a, b) => a.order - b.order);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  if (displayItems.length === 0) return null;

  return (
    <section className="lcb-gallery" aria-labelledby="selected-works-heading">
      <div className="lcb-section-heading">
        <p>Loose frames</p>
        <h2 id="selected-works-heading">Selected Works</h2>
      </div>

      <div className="lcb-gallery__sequence">
        {displayItems.map((item, index) => (
          <figure key={item.id} className="lcb-gallery__frame" data-slot={(index % 6) + 1}>
            {item.type === "video" ? (
              activeVideoId === item.id ? (
                <video
                  src={item.url}
                  poster={item.poster_url || undefined}
                  controls
                  playsInline
                  {...{ "webkit-playsinline": "true", "x5-playsinline": "true" }}
                  preload="metadata"
                />
              ) : (
                <button type="button" onClick={() => setActiveVideoId(item.id)} aria-label={`Load video${item.title ? `: ${item.title}` : ""}`}>
                  {item.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.poster_url} alt={item.alt || ""} loading="lazy" />
                  ) : <span aria-hidden="true" />}
                  <span className="lcb-gallery__play"><Play aria-hidden="true" fill="currentColor" /> Play film</span>
                </button>
              )
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.alt || ""} loading="lazy" />
            )}
            {item.title || item.caption ? (
              <figcaption>
                {item.title ? <strong>{item.title}</strong> : null}
                {item.caption ? <span>{item.caption}</span> : null}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
