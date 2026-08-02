"use client";

import { useCallback, useState } from "react";
import { Play } from "lucide-react";
import type { LandingMediaItem } from "@/lib/types";
import { SakuraCorner, SakuraCrest } from "./NatureOrnament";

export function HomeMediaGallery({ items }: { items: LandingMediaItem[] }) {
  const displayItems = [...items].filter((item) => item.enabled && item.url.trim()).sort((a, b) => a.order - b.order);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // Ref callback: called when the video element mounts after user clicks.
  // Running play() here keeps it inside the user-gesture chain so Safari
  // does not block autoplay. Falls back to muted if unmuted is denied.
  const videoMountRef = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    void el.play().catch(() => {
      el.muted = true;
      void el.play().catch(() => {});
    });
  }, []);

  if (displayItems.length === 0) return null;

  return (
    <section className="lcb-gallery relative overflow-hidden" aria-labelledby="selected-works-heading">
      <SakuraCorner position="top-right" />
      <div className="lcb-section-heading">
        <p className="flex items-center gap-2">
          <span>Loose frames</span>
          <SakuraCrest className="h-3 w-3 opacity-75" />
        </p>
        <h2 id="selected-works-heading">Selected Works</h2>
      </div>

      <div className="lcb-gallery__sequence">
        {displayItems.map((item, index) => (
          <figure key={item.id} className="lcb-gallery__frame" data-slot={(index % 6) + 1}>
            {item.type === "video" ? (
              activeVideoId === item.id ? (
                <video ref={videoMountRef} src={item.url} poster={item.poster_url || undefined} controls playsInline preload="metadata" />
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
